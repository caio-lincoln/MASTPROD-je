import { createClient } from '@supabase/supabase-js'
import { EsocialConsultaFuncionarios, EventoFuncionario } from './consulta-funcionarios'
import { EsocialFuncionariosParser, DadosFuncionarioCompleto } from './funcionarios-parser'
import { EsocialConfig } from './types'

export interface SincronizacaoResult {
  sucesso: boolean
  funcionarios_processados: number
  funcionarios_novos: number
  funcionarios_atualizados: number
  erros: string[]
  tempo_execucao: number
}

export class EsocialFuncionariosService {
  private supabase: any
  private consultaService: EsocialConsultaFuncionarios

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey)
    this.consultaService = new EsocialConsultaFuncionarios()
  }

  /**
   * Sincroniza funcionários de uma empresa com o eSocial
   */
  async sincronizarFuncionarios(
    cnpj: string,
    config: EsocialConfig,
    dataInicio?: string,
    dataFim?: string
  ): Promise<SincronizacaoResult> {
    const inicioExecucao = Date.now()
    const resultado: SincronizacaoResult = {
      sucesso: false,
      funcionarios_processados: 0,
      funcionarios_novos: 0,
      funcionarios_atualizados: 0,
      erros: [],
      tempo_execucao: 0
    }

    try {
      console.log(`Iniciando sincronização para CNPJ: ${cnpj}`)

      // 1. Consultar eventos do eSocial
      const eventosResponse = await this.consultaService.consultarEventosFuncionarios(
        cnpj,
        config,
        dataInicio,
        dataFim
      )

      if (!eventosResponse.sucesso) {
        resultado.erros.push(`Erro ao consultar eSocial: ${eventosResponse.erro}`)
        return resultado
      }

      console.log(`Encontrados ${eventosResponse.eventos.length} eventos`)

      // 2. Consolidar dados dos funcionários
      const funcionariosConsolidados = EsocialFuncionariosParser.consolidarFuncionarios(
        eventosResponse.eventos
      )

      console.log(`Consolidados ${funcionariosConsolidados.length} funcionários`)

      // 3. Salvar eventos no banco
      await this.salvarEventos(cnpj, eventosResponse.eventos)

      // 4. Processar cada funcionário
      for (const funcionario of funcionariosConsolidados) {
        try {
          const validacao = EsocialFuncionariosParser.validarDadosFuncionario(funcionario)
          
          if (!validacao.valido) {
            resultado.erros.push(
              `Funcionário ${funcionario.cpf}: ${validacao.erros.join(', ')}`
            )
            continue
          }

          const foiNovo = await this.salvarOuAtualizarFuncionario(cnpj, funcionario)
          
          if (foiNovo) {
            resultado.funcionarios_novos++
          } else {
            resultado.funcionarios_atualizados++
          }

          resultado.funcionarios_processados++

        } catch (error) {
          resultado.erros.push(
            `Erro ao processar funcionário ${funcionario.cpf}: ${error}`
          )
        }
      }

      // 5. Atualizar timestamp da última sincronização
      await this.atualizarUltimaSincronizacao(cnpj)

      resultado.sucesso = resultado.erros.length === 0
      resultado.tempo_execucao = Date.now() - inicioExecucao

      console.log(`Sincronização concluída em ${resultado.tempo_execucao}ms`)
      
      return resultado

    } catch (error) {
      resultado.erros.push(`Erro geral na sincronização: ${error}`)
      resultado.tempo_execucao = Date.now() - inicioExecucao
      return resultado
    }
  }

  /**
   * Salva eventos do eSocial no banco
   */
  private async salvarEventos(cnpj: string, eventos: EventoFuncionario[]): Promise<void> {
    for (const evento of eventos) {
      try {
        // Verificar se evento já existe
        const { data: eventoExistente } = await this.supabase
          .from('esocial_eventos')
          .select('id')
          .eq('cnpj_empresa', cnpj)
          .eq('cpf_funcionario', evento.cpf)
          .eq('tipo_evento', evento.tipo)
          .eq('data_evento', evento.data_evento)
          .single()

        if (eventoExistente) {
          continue // Evento já existe
        }

        // Inserir novo evento
        const { error } = await this.supabase
          .from('esocial_eventos')
          .insert({
            cnpj_empresa: cnpj,
            cpf_funcionario: evento.cpf,
            tipo_evento: evento.tipo,
            data_evento: evento.data_evento,
            conteudo_xml: evento.xml_original,
            dados_funcionario: {
              nome: evento.nome,
              matricula: evento.matricula,
              cargo: evento.cargo,
              categoria: evento.categoria,
              data_admissao: evento.data_admissao,
              data_desligamento: evento.data_desligamento
            },
            processado: true,
            processado_em: new Date().toISOString()
          })

        if (error) {
          console.error(`Erro ao salvar evento ${evento.tipo} para CPF ${evento.cpf}:`, error)
        }

      } catch (error) {
        console.error(`Erro ao processar evento:`, error)
      }
    }
  }

  /**
   * Salva ou atualiza funcionário no banco
   */
  private async salvarOuAtualizarFuncionario(
    cnpj: string,
    funcionario: DadosFuncionarioCompleto
  ): Promise<boolean> {
    // Verificar se funcionário já existe
    const { data: funcionarioExistente } = await this.supabase
      .from('esocial_funcionarios')
      .select('id, hash_dados')
      .eq('cnpj_empresa', cnpj)
      .eq('cpf', funcionario.cpf)
      .single()

    const hashAtual = EsocialFuncionariosParser.gerarHashDados(funcionario)
    const dadosFuncionario = {
      cnpj_empresa: cnpj,
      cpf: funcionario.cpf,
      nome: funcionario.nome,
      matricula: funcionario.matricula,
      cargo: funcionario.cargo,
      categoria: funcionario.categoria,
      data_admissao: funcionario.data_admissao,
      data_desligamento: funcionario.data_desligamento,
      situacao_atual: funcionario.situacao,
      hash_dados: hashAtual,
      total_eventos: funcionario.historico_eventos.length,
      ultimo_evento_tipo: funcionario.ultimo_evento.tipo,
      ultimo_evento_data: funcionario.ultimo_evento.data_evento,
      updated_at: new Date().toISOString()
    }

    if (funcionarioExistente) {
      // Verificar se houve mudanças
      if (funcionarioExistente.hash_dados === hashAtual) {
        return false // Sem mudanças
      }

      // Atualizar funcionário existente
      const { error } = await this.supabase
        .from('esocial_funcionarios')
        .update(dadosFuncionario)
        .eq('id', funcionarioExistente.id)

      if (error) {
        throw new Error(`Erro ao atualizar funcionário: ${error.message}`)
      }

      return false // Atualização

    } else {
      // Inserir novo funcionário
      const { error } = await this.supabase
        .from('esocial_funcionarios')
        .insert({
          ...dadosFuncionario,
          created_at: new Date().toISOString()
        })

      if (error) {
        throw new Error(`Erro ao inserir funcionário: ${error.message}`)
      }

      return true // Novo funcionário
    }
  }

  /**
   * Atualiza timestamp da última sincronização
   */
  private async atualizarUltimaSincronizacao(cnpj: string): Promise<void> {
    const { error } = await this.supabase
      .from('empresas')
      .update({
        ultima_sincronizacao_esocial: new Date().toISOString()
      })
      .eq('cnpj', cnpj)

    if (error) {
      console.error('Erro ao atualizar timestamp de sincronização:', error)
    }
  }

  /**
   * Lista funcionários de uma empresa
   */
  async listarFuncionarios(
    cnpj: string,
    filtros?: {
      situacao?: "Ativo" | "Desligado"
      nome?: string
      cargo?: string
      limite?: number
      offset?: number
    }
  ): Promise<DadosFuncionarioCompleto[]> {
    let query = this.supabase
      .from('esocial_funcionarios')
      .select('*')
      .eq('cnpj_empresa', cnpj)

    // Aplicar filtros
    if (filtros?.situacao) {
      query = query.eq('situacao_atual', filtros.situacao)
    }

    if (filtros?.nome) {
      query = query.ilike('nome', `%${filtros.nome}%`)
    }

    if (filtros?.cargo) {
      query = query.ilike('cargo', `%${filtros.cargo}%`)
    }

    // Paginação
    if (filtros?.limite) {
      query = query.limit(filtros.limite)
    }

    if (filtros?.offset) {
      query = query.range(filtros.offset, (filtros.offset + (filtros.limite || 50)) - 1)
    }

    // Ordenação
    query = query.order('nome', { ascending: true })

    const { data, error } = await query

    if (error) {
      throw new Error(`Erro ao consultar funcionários: ${error.message}`)
    }

    // Converter para formato esperado
    return (data || []).map(funcionario => ({
      cpf: funcionario.cpf,
      nome: funcionario.nome,
      matricula: funcionario.matricula,
      cargo: funcionario.cargo,
      categoria: funcionario.categoria,
      data_admissao: funcionario.data_admissao,
      data_desligamento: funcionario.data_desligamento,
      situacao: funcionario.situacao_atual,
      historico_eventos: [], // Carregar separadamente se necessário
      ultimo_evento: {
        tipo: funcionario.ultimo_evento_tipo,
        data_evento: funcionario.ultimo_evento_data,
        cpf: funcionario.cpf,
        nome: funcionario.nome,
        matricula: funcionario.matricula,
        cargo: funcionario.cargo,
        categoria: funcionario.categoria,
        data_admissao: funcionario.data_admissao,
        data_desligamento: funcionario.data_desligamento,
        xml_original: ''
      }
    }))
  }

  /**
   * Obtém estatísticas de funcionários
   */
  async obterEstatisticas(cnpj: string): Promise<{
    total: number
    ativos: number
    desligados: number
    ultima_sincronizacao?: string
  }> {
    const { data, error } = await this.supabase
      .from('esocial_funcionarios')
      .select('situacao_atual')
      .eq('cnpj_empresa', cnpj)

    if (error) {
      throw new Error(`Erro ao obter estatísticas: ${error.message}`)
    }

    const total = data?.length || 0
    const ativos = data?.filter(f => f.situacao_atual === 'Ativo').length || 0
    const desligados = total - ativos

    // Buscar última sincronização
    const { data: empresa } = await this.supabase
      .from('empresas')
      .select('ultima_sincronizacao_esocial')
      .eq('cnpj', cnpj)
      .single()

    return {
      total,
      ativos,
      desligados,
      ultima_sincronizacao: empresa?.ultima_sincronizacao_esocial
    }
  }
}