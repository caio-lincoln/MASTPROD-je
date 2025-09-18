import { createClient } from '@supabase/supabase-js'
import { EsocialConsultaRealFuncionarios, DadosFuncionarioConsolidado } from './consulta-real-funcionarios'

export interface ResultadoPersistencia {
  sucesso: boolean
  funcionarios_processados: number
  funcionarios_novos: number
  funcionarios_atualizados: number
  erros: string[]
  tempo_execucao: number
}

export class EsocialPersistenciaFuncionarios {
  private supabase: any

  constructor(supabaseClient: any) {
    this.supabase = supabaseClient
  }

  /**
   * Sincroniza funcionários do eSocial com a tabela funcionarios
   */
  async sincronizarFuncionarios(
    cnpj: string,
    empresaId: string,
    config: {
      certificado: string
      senha: string
      ambiente: "producao" | "producao-restrita"
      urls: {
        recepcaoLote: string
        consultaLote: string
        downloadEvento: string
        consultaEventos: string
      }
    },
    dataInicio?: string,
    dataFim?: string
  ): Promise<ResultadoPersistencia> {
    const inicioExecucao = Date.now()
    const resultado: ResultadoPersistencia = {
      sucesso: false,
      funcionarios_processados: 0,
      funcionarios_novos: 0,
      funcionarios_atualizados: 0,
      erros: [],
      tempo_execucao: 0
    }

    try {
      console.log(`Iniciando sincronização de funcionários para CNPJ: ${cnpj}`)

      // Instanciar serviço de consulta
      const consultaService = new EsocialConsultaRealFuncionarios()

      // Consultar funcionários do eSocial
      const funcionariosEsocial = await consultaService.consultarFuncionarios(
        cnpj,
        config,
        dataInicio,
        dataFim
      )

      console.log(`Encontrados ${funcionariosEsocial.length} funcionários no eSocial`)

      // Processar cada funcionário
      for (const funcionario of funcionariosEsocial) {
        try {
          const foiNovo = await this.salvarOuAtualizarFuncionario(empresaId, funcionario)
          
          if (foiNovo) {
            resultado.funcionarios_novos++
          } else {
            resultado.funcionarios_atualizados++
          }
          
          resultado.funcionarios_processados++

        } catch (error) {
          const mensagemErro = `Erro ao processar funcionário ${funcionario.cpf}: ${error}`
          console.error(mensagemErro)
          resultado.erros.push(mensagemErro)
        }
      }

      // Registrar log de sincronização
      await this.registrarLogSincronizacao(cnpj, empresaId, resultado)

      resultado.sucesso = resultado.erros.length === 0
      resultado.tempo_execucao = Date.now() - inicioExecucao

      console.log(`Sincronização concluída: ${resultado.funcionarios_processados} processados, ${resultado.funcionarios_novos} novos, ${resultado.funcionarios_atualizados} atualizados`)

      return resultado

    } catch (error) {
      const mensagemErro = `Erro geral na sincronização: ${error}`
      console.error(mensagemErro)
      resultado.erros.push(mensagemErro)
      resultado.tempo_execucao = Date.now() - inicioExecucao
      return resultado
    }
  }

  /**
   * Salva ou atualiza funcionário na tabela funcionarios
   */
  private async salvarOuAtualizarFuncionario(
    empresaId: string,
    funcionario: DadosFuncionarioConsolidado
  ): Promise<boolean> {
    try {
      // Verificar se funcionário já existe (por CPF e empresa)
      const { data: funcionarioExistente } = await this.supabase
        .from('funcionarios')
        .select('id, cpf, nome, matricula_esocial, cargo, status')
        .eq('empresa_id', empresaId)
        .eq('cpf', funcionario.cpf)
        .single()

      // Preparar dados para inserção/atualização
      const dadosFuncionario = {
        nome: funcionario.nome || 'Nome não informado',
        cpf: funcionario.cpf,
        matricula_esocial: funcionario.matricula || null,
        cargo: funcionario.cargo || 'Cargo não informado',
        setor: this.extrairSetor(funcionario.cargo),
        status: funcionario.situacao === 'Ativo',
        updated_at: new Date().toISOString()
      }

      if (funcionarioExistente) {
        // Verificar se houve mudanças significativas
        const houveMudanca = (
          funcionarioExistente.nome !== dadosFuncionario.nome ||
          funcionarioExistente.matricula_esocial !== dadosFuncionario.matricula_esocial ||
          funcionarioExistente.cargo !== dadosFuncionario.cargo ||
          funcionarioExistente.status !== dadosFuncionario.status
        )

        if (houveMudanca) {
          // Atualizar funcionário existente
          const { error } = await this.supabase
            .from('funcionarios')
            .update(dadosFuncionario)
            .eq('id', funcionarioExistente.id)

          if (error) {
            throw new Error(`Erro ao atualizar funcionário: ${error.message}`)
          }

          console.log(`Funcionário atualizado: ${funcionario.nome} (${funcionario.cpf})`)
        }

        return false // Funcionário existente (atualizado ou não)

      } else {
        // Inserir novo funcionário
        const { error } = await this.supabase
          .from('funcionarios')
          .insert({
            empresa_id: empresaId,
            ...dadosFuncionario,
            created_at: new Date().toISOString()
          })

        if (error) {
          throw new Error(`Erro ao inserir funcionário: ${error.message}`)
        }

        console.log(`Novo funcionário inserido: ${funcionario.nome} (${funcionario.cpf})`)
        return true // Novo funcionário
      }

    } catch (error) {
      throw new Error(`Erro ao salvar funcionário ${funcionario.cpf}: ${error}`)
    }
  }

  /**
   * Extrai setor do cargo (lógica simples)
   */
  private extrairSetor(cargo?: string): string {
    if (!cargo) return 'Não informado'

    const cargoLower = cargo.toLowerCase()
    
    if (cargoLower.includes('administrativ') || cargoLower.includes('escritório')) {
      return 'Administrativo'
    } else if (cargoLower.includes('operacion') || cargoLower.includes('produção')) {
      return 'Operacional'
    } else if (cargoLower.includes('gerente') || cargoLower.includes('coordenador')) {
      return 'Gestão'
    } else if (cargoLower.includes('vendas') || cargoLower.includes('comercial')) {
      return 'Comercial'
    } else if (cargoLower.includes('técnico') || cargoLower.includes('especialista')) {
      return 'Técnico'
    }

    return 'Geral'
  }

  /**
   * Registra log da sincronização
   */
  private async registrarLogSincronizacao(
    cnpj: string,
    empresaId: string,
    resultado: ResultadoPersistencia
  ): Promise<void> {
    try {
      await this.supabase
        .from('logs_esocial')
        .insert({
          empresa_id: empresaId,
          operacao: 'sincronizacao_funcionarios_tabela',
          status: resultado.sucesso ? 'concluido' : 'erro',
          detalhes: {
            cnpj,
            funcionarios_processados: resultado.funcionarios_processados,
            funcionarios_novos: resultado.funcionarios_novos,
            funcionarios_atualizados: resultado.funcionarios_atualizados,
            tempo_execucao_ms: resultado.tempo_execucao,
            erros: resultado.erros
          },
          processado_em: new Date().toISOString()
        })
    } catch (error) {
      console.error('Erro ao registrar log de sincronização:', error)
    }
  }

  /**
   * Lista funcionários da tabela funcionarios
   */
  async listarFuncionarios(
    empresaId: string,
    filtros?: {
      status?: boolean
      nome?: string
      cargo?: string
      limite?: number
      offset?: number
    }
  ): Promise<any[]> {
    try {
      let query = this.supabase
        .from('funcionarios')
        .select('*')
        .eq('empresa_id', empresaId)

      // Aplicar filtros
      if (filtros?.status !== undefined) {
        query = query.eq('status', filtros.status)
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

      return data || []

    } catch (error) {
      console.error('Erro ao listar funcionários:', error)
      throw error
    }
  }

  /**
   * Obtém estatísticas dos funcionários
   */
  async obterEstatisticas(empresaId: string): Promise<{
    total: number
    ativos: number
    inativos: number
    ultima_sincronizacao?: string
  }> {
    try {
      // Contar funcionários por status
      const { data: estatisticas, error } = await this.supabase
        .from('funcionarios')
        .select('status')
        .eq('empresa_id', empresaId)

      if (error) {
        throw new Error(`Erro ao obter estatísticas: ${error.message}`)
      }

      const total = estatisticas?.length || 0
      const ativos = estatisticas?.filter(f => f.status === true).length || 0
      const inativos = total - ativos

      // Buscar última sincronização
      const { data: ultimoLog } = await this.supabase
        .from('logs_esocial')
        .select('processado_em')
        .eq('empresa_id', empresaId)
        .eq('operacao', 'sincronizacao_funcionarios_tabela')
        .eq('status', 'concluido')
        .order('processado_em', { ascending: false })
        .limit(1)
        .single()

      return {
        total,
        ativos,
        inativos,
        ultima_sincronizacao: ultimoLog?.processado_em || undefined
      }

    } catch (error) {
      console.error('Erro ao obter estatísticas:', error)
      return { total: 0, ativos: 0, inativos: 0 }
    }
  }
}