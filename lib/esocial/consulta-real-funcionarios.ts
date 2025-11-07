import { EsocialConfig } from "./types"
import { createEsocialFetchOptions } from "./ssl-config"
import { createClient } from "@supabase/supabase-js"

export interface FuncionarioEsocial {
  cpf: string
  nome: string
  matricula?: string
  cargo?: string
  categoria?: string
  data_admissao?: string
  data_desligamento?: string
  situacao: "Ativo" | "Desligado"
  ultimo_evento: {
    tipo: string
    data: string
    numero_recibo?: string
  }
  historico_eventos: Array<{
    tipo: string
    data: string
    xml_original: string
    numero_recibo?: string
  }>
}

export interface ConsultaRealResponse {
  sucesso: boolean
  funcionarios: FuncionarioEsocial[]
  total_eventos_processados: number
  erros?: Array<{
    codigo: string
    descricao: string
    tipo: "erro" | "aviso"
  }>
  metadados: {
    cnpj_empresa: string
    periodo_consulta: {
      data_inicio: string
      data_fim: string
    }
    tipos_eventos_consultados: string[]
    data_consulta: string
  }
}

export class EsocialConsultaRealFuncionarios {
  private config: EsocialConfig
  private supabase: ReturnType<typeof createClient>

  constructor(config: EsocialConfig) {
    this.config = config
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }

  /**
   * Consulta funcionários reais do eSocial e persiste no banco
   */
  async consultarFuncionariosReais(
    dataInicio: string,
    dataFim: string,
    tiposEvento: string[] = ["S-2200", "S-2206", "S-2299", "S-2300", "S-2399"]
  ): Promise<ConsultaRealResponse> {
    const response: ConsultaRealResponse = {
      sucesso: false,
      funcionarios: [],
      total_eventos_processados: 0,
      metadados: {
        cnpj_empresa: this.config.cnpj,
        periodo_consulta: { data_inicio: dataInicio, data_fim: dataFim },
        tipos_eventos_consultados: tiposEvento,
        data_consulta: new Date().toISOString()
      }
    }

    try {
      console.log(`🔍 Iniciando consulta real eSocial para CNPJ: ${this.config.cnpj}`)
      
      // Registrar início da operação
      await this.registrarLogOperacao("iniciado", "Iniciando consulta de funcionários do eSocial")

      const todosEventos: any[] = []
      const erros: any[] = []

      // Consultar cada tipo de evento
      for (const tipoEvento of tiposEvento) {
        try {
          console.log(`📋 Consultando eventos ${tipoEvento}...`)
          const eventos = await this.consultarEventosPorTipo(tipoEvento, dataInicio, dataFim)
          
          if (eventos.length > 0) {
            console.log(`✅ Encontrados ${eventos.length} eventos ${tipoEvento}`)
            todosEventos.push(...eventos)
            
            // Salvar eventos no banco
            await this.salvarEventosNoBanco(eventos, tipoEvento)
          } else {
            console.log(`ℹ️ Nenhum evento ${tipoEvento} encontrado no período`)
          }
        } catch (error) {
          console.error(`❌ Erro ao consultar eventos ${tipoEvento}:`, error)
          erros.push({
            codigo: `ERRO_${tipoEvento}`,
            descricao: `Erro ao consultar eventos ${tipoEvento}: ${error}`,
            tipo: "erro" as const
          })
        }
      }

      // Processar eventos e consolidar funcionários
      const funcionarios = await this.processarEventosEConsolidarFuncionarios(todosEventos)
      
      // Atualizar tabela de funcionários consolidada
      await this.atualizarTabelaFuncionarios(funcionarios)

      // Atualizar timestamp da última sincronização
      await this.atualizarUltimaSincronizacao()

      response.sucesso = true
      response.funcionarios = funcionarios
      response.total_eventos_processados = todosEventos.length
      response.erros = erros.length > 0 ? erros : undefined

      await this.registrarLogOperacao("concluido", 
        `Consulta concluída: ${funcionarios.length} funcionários, ${todosEventos.length} eventos processados`)

      console.log(`✅ Consulta concluída: ${funcionarios.length} funcionários encontrados`)

    } catch (error) {
      console.error("❌ Erro na consulta eSocial:", error)
      
      response.erros = [{
        codigo: "ERRO_GERAL",
        descricao: `Erro geral na consulta: ${error}`,
        tipo: "erro"
      }]

      await this.registrarLogOperacao("erro", `Erro na consulta: ${error}`)
    }

    return response
  }

  /**
   * Consulta eventos de um tipo específico no eSocial
   */
  private async consultarEventosPorTipo(
    tipoEvento: string,
    dataInicio: string,
    dataFim: string
  ): Promise<any[]> {
    const envelope = this.criarEnvelopeConsultaEventos(tipoEvento, dataInicio, dataFim)
    
    const fetchOptions = createEsocialFetchOptions('POST', envelope, {
      SOAPAction: "http://www.esocial.gov.br/servicos/empregador/consulta/eventos/v1_0_0/ServicoConsultarEventos/ConsultarEventos",
    })
    
    const response = await fetch(this.config.url_consulta_eventos, fetchOptions)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const xmlResponse = await response.text()
    return this.parseConsultaEventosResponse(xmlResponse, tipoEvento)
  }

  /**
   * Cria envelope SOAP para consulta de eventos
   */
  private criarEnvelopeConsultaEventos(
    tipoEvento: string,
    dataInicio: string,
    dataFim: string
  ): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" 
               xmlns:esoc="http://www.esocial.gov.br/servicos/empregador/consulta/eventos/v1_0_0">
  <soap:Header />
  <soap:Body>
    <esoc:ConsultarEventos>
      <esoc:consulta>
        <esoc:ideEmpregador>
          <esoc:tpInsc>1</esoc:tpInsc>
          <esoc:nrInsc>${this.config.cnpj}</esoc:nrInsc>
        </esoc:ideEmpregador>
        <esoc:consultaEventos>
          <esoc:tipoEvento>${tipoEvento}</esoc:tipoEvento>
          <esoc:perApur>${dataInicio}</esoc:perApur>
          <esoc:perApurFim>${dataFim}</esoc:perApurFim>
        </esoc:consultaEventos>
      </esoc:consulta>
    </esoc:ConsultarEventos>
  </soap:Body>
</soap:Envelope>`
  }

  /**
   * Faz parse da resposta XML do eSocial
   */
  private parseConsultaEventosResponse(xmlResponse: string, tipoEvento: string): any[] {
    const eventos: any[] = []

    try {
      // Parse do XML usando DOMParser
      const parser = new DOMParser()
      const doc = parser.parseFromString(xmlResponse, "text/xml")

      // Verificar se há erros na resposta
      const erros = doc.querySelectorAll("erro")
      if (erros.length > 0) {
        erros.forEach(erro => {
          const codigo = erro.querySelector("codigo")?.textContent || ""
          const descricao = erro.querySelector("descricao")?.textContent || ""
          console.error(`Erro eSocial ${codigo}: ${descricao}`)
        })
        return eventos
      }

      // Buscar eventos na resposta
      const eventosNodes = doc.querySelectorAll("evento")

      eventosNodes.forEach((eventoNode) => {
        const evento = this.extrairDadosEvento(eventoNode, tipoEvento)
        if (evento) {
          eventos.push(evento)
        }
      })

    } catch (error) {
      console.error("Erro ao fazer parse da resposta XML:", error)
    }

    return eventos
  }

  /**
   * Extrai dados de um evento específico
   */
  private extrairDadosEvento(eventoNode: Element, tipoEvento: string): any | null {
    try {
      const id = eventoNode.getAttribute("id") || ""
      const numeroRecibo = eventoNode.querySelector("numeroRecibo")?.textContent || ""
      const dataEvento = eventoNode.querySelector("dataEvento")?.textContent || ""

      // Extrair dados específicos baseado no tipo de evento
      let dadosFuncionario: any = {}

      switch (tipoEvento) {
        case "S-2200": // Admissão
          dadosFuncionario = this.extrairDadosS2200(eventoNode)
          break
        case "S-2206": // Alteração contratual
          dadosFuncionario = this.extrairDadosS2206(eventoNode)
          break
        case "S-2299": // Desligamento
          dadosFuncionario = this.extrairDadosS2299(eventoNode)
          break
        case "S-2300": // TSV - Trabalhador sem vínculo
          dadosFuncionario = this.extrairDadosS2300(eventoNode)
          break
        case "S-2399": // Término TSV
          dadosFuncionario = this.extrairDadosS2399(eventoNode)
          break
      }

      return {
        id,
        tipo: tipoEvento,
        numero_recibo: numeroRecibo,
        data_evento: dataEvento,
        xml_original: eventoNode.outerHTML,
        ...dadosFuncionario
      }

    } catch (error) {
      console.error("Erro ao extrair dados do evento:", error)
      return null
    }
  }

  /**
   * Extrai dados específicos do evento S-2200 (Admissão)
   */
  private extrairDadosS2200(eventoNode: Element): any {
    return {
      cpf: eventoNode.querySelector("cpfTrab")?.textContent || "",
      nome: eventoNode.querySelector("nmTrab")?.textContent || "",
      matricula: eventoNode.querySelector("matricula")?.textContent || "",
      cargo: eventoNode.querySelector("codCargo")?.textContent || "",
      categoria: this.mapearCategoria(eventoNode.querySelector("codCateg")?.textContent || ""),
      data_admissao: eventoNode.querySelector("dtAdm")?.textContent || "",
      situacao: "Ativo"
    }
  }

  /**
   * Extrai dados específicos do evento S-2206 (Alteração contratual)
   */
  private extrairDadosS2206(eventoNode: Element): any {
    return {
      cpf: eventoNode.querySelector("cpfTrab")?.textContent || "",
      matricula: eventoNode.querySelector("matricula")?.textContent || "",
      cargo: eventoNode.querySelector("codCargo")?.textContent || "",
      categoria: this.mapearCategoria(eventoNode.querySelector("codCateg")?.textContent || ""),
      situacao: "Ativo"
    }
  }

  /**
   * Extrai dados específicos do evento S-2299 (Desligamento)
   */
  private extrairDadosS2299(eventoNode: Element): any {
    return {
      cpf: eventoNode.querySelector("cpfTrab")?.textContent || "",
      matricula: eventoNode.querySelector("matricula")?.textContent || "",
      data_desligamento: eventoNode.querySelector("dtDeslig")?.textContent || "",
      situacao: "Desligado"
    }
  }

  /**
   * Extrai dados específicos do evento S-2300 (TSV)
   */
  private extrairDadosS2300(eventoNode: Element): any {
    return {
      cpf: eventoNode.querySelector("cpfTrab")?.textContent || "",
      nome: eventoNode.querySelector("nmTrab")?.textContent || "",
      categoria: this.mapearCategoria(eventoNode.querySelector("codCateg")?.textContent || ""),
      data_admissao: eventoNode.querySelector("dtIniTSV")?.textContent || "",
      situacao: "Ativo"
    }
  }

  /**
   * Extrai dados específicos do evento S-2399 (Término TSV)
   */
  private extrairDadosS2399(eventoNode: Element): any {
    return {
      cpf: eventoNode.querySelector("cpfTrab")?.textContent || "",
      data_desligamento: eventoNode.querySelector("dtTerm")?.textContent || "",
      situacao: "Desligado"
    }
  }

  /**
   * Mapeia código de categoria para descrição
   */
  private mapearCategoria(codigo: string): string {
    const categorias: { [key: string]: string } = {
      "101": "Empregado CLT",
      "102": "Empregado CLT - Trabalhador Rural",
      "103": "Empregado CLT - Aprendiz",
      "104": "Empregado CLT - Doméstico",
      "201": "Servidor público ocupante de cargo efetivo",
      "202": "Servidor público ocupante de cargo exclusivo em comissão",
      "301": "Trabalhador sem vínculo - Autônomo",
      "302": "Trabalhador sem vínculo - Avulso"
    }

    return categorias[codigo] || `Categoria ${codigo}`
  }

  /**
   * Salva eventos no banco de dados
   */
  private async salvarEventosNoBanco(eventos: any[], tipoEvento: string): Promise<void> {
    for (const evento of eventos) {
      try {
        // Verificar se evento já existe
        const { data: eventoExistente } = await this.supabase
          .from('esocial_eventos')
          .select('id')
          .eq('cnpj_empresa', this.config.cnpj)
          .eq('cpf_funcionario', evento.cpf)
          .eq('tipo_evento', evento.tipo)
          .eq('numero_recibo', evento.numero_recibo)
          .single()

        if (eventoExistente) {
          continue // Evento já existe
        }

        // Inserir novo evento
        const { error } = await this.supabase
          .from('esocial_eventos')
          .insert({
            cnpj_empresa: this.config.cnpj,
            cpf_funcionario: evento.cpf,
            tipo_evento: evento.tipo,
            data_evento: evento.data_evento,
            numero_recibo: evento.numero_recibo,
            conteudo_xml: evento.xml_original,
            dados_funcionario: {
              nome: evento.nome,
              matricula: evento.matricula,
              cargo: evento.cargo,
              categoria: evento.categoria,
              data_admissao: evento.data_admissao,
              data_desligamento: evento.data_desligamento,
              situacao: evento.situacao
            },
            status_processamento: 'processado',
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
   * Processa eventos e consolida dados dos funcionários
   */
  private async processarEventosEConsolidarFuncionarios(eventos: any[]): Promise<FuncionarioEsocial[]> {
    const funcionariosMap = new Map<string, FuncionarioEsocial>()

    // Agrupar eventos por CPF
    const eventosPorCpf = new Map<string, any[]>()
    
    eventos.forEach(evento => {
      if (!evento.cpf) return
      
      if (!eventosPorCpf.has(evento.cpf)) {
        eventosPorCpf.set(evento.cpf, [])
      }
      eventosPorCpf.get(evento.cpf)!.push(evento)
    })

    // Processar cada funcionário
    for (const [cpf, eventosFunc] of eventosPorCpf) {
      // Ordenar eventos por data
      eventosFunc.sort((a, b) => new Date(a.data_evento).getTime() - new Date(b.data_evento).getTime())

      const funcionario: FuncionarioEsocial = {
        cpf,
        nome: "",
        situacao: "Ativo",
        ultimo_evento: {
          tipo: "",
          data: "",
          numero_recibo: ""
        },
        historico_eventos: []
      }

      // Processar eventos em ordem cronológica
      for (const evento of eventosFunc) {
        // Atualizar dados do funcionário baseado no evento
        if (evento.nome) funcionario.nome = evento.nome
        if (evento.matricula) funcionario.matricula = evento.matricula
        if (evento.cargo) funcionario.cargo = evento.cargo
        if (evento.categoria) funcionario.categoria = evento.categoria
        if (evento.data_admissao) funcionario.data_admissao = evento.data_admissao
        if (evento.data_desligamento) funcionario.data_desligamento = evento.data_desligamento
        if (evento.situacao) funcionario.situacao = evento.situacao

        // Adicionar ao histórico
        funcionario.historico_eventos.push({
          tipo: evento.tipo,
          data: evento.data_evento,
          xml_original: evento.xml_original,
          numero_recibo: evento.numero_recibo
        })

        // Atualizar último evento
        funcionario.ultimo_evento = {
          tipo: evento.tipo,
          data: evento.data_evento,
          numero_recibo: evento.numero_recibo
        }
      }

      funcionariosMap.set(cpf, funcionario)
    }

    return Array.from(funcionariosMap.values())
  }

  /**
   * Atualiza tabela consolidada de funcionários
   */
  private async atualizarTabelaFuncionarios(funcionarios: FuncionarioEsocial[]): Promise<void> {
    for (const funcionario of funcionarios) {
      try {
        // Verificar se funcionário já existe
        const { data: funcionarioExistente } = await this.supabase
          .from('esocial_funcionarios')
          .select('id')
          .eq('cnpj_empresa', this.config.cnpj)
          .eq('cpf', funcionario.cpf)
          .single()

        const dadosFuncionario = {
          cnpj_empresa: this.config.cnpj,
          cpf: funcionario.cpf,
          nome: funcionario.nome,
          matricula: funcionario.matricula,
          cargo: funcionario.cargo,
          categoria: funcionario.categoria,
          data_admissao: funcionario.data_admissao,
          data_desligamento: funcionario.data_desligamento,
          situacao_atual: funcionario.situacao,
          total_eventos: funcionario.historico_eventos.length,
          ultimo_evento_tipo: funcionario.ultimo_evento.tipo,
          ultimo_evento_data: funcionario.ultimo_evento.data,
          updated_at: new Date().toISOString()
        }

        if (funcionarioExistente) {
          // Atualizar funcionário existente
          await this.supabase
            .from('esocial_funcionarios')
            .update(dadosFuncionario)
            .eq('id', funcionarioExistente.id)
        } else {
          // Inserir novo funcionário
          await this.supabase
            .from('esocial_funcionarios')
            .insert({
              ...dadosFuncionario,
              created_at: new Date().toISOString()
            })
        }

      } catch (error) {
        console.error(`Erro ao atualizar funcionário ${funcionario.cpf}:`, error)
      }
    }
  }

  /**
   * Atualiza timestamp da última sincronização
   */
  private async atualizarUltimaSincronizacao(): Promise<void> {
    try {
      await this.supabase
        .from('empresas')
        .update({ 
          ultima_sincronizacao_esocial: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('cnpj', this.config.cnpj)
    } catch (error) {
      console.error("Erro ao atualizar última sincronização:", error)
    }
  }

  /**
   * Registra log da operação
   */
  private async registrarLogOperacao(status: string, descricao: string): Promise<void> {
    try {
      // Buscar empresa
      const { data: empresa } = await this.supabase
        .from('empresas')
        .select('id')
        .eq('cnpj', this.config.cnpj)
        .single()

      if (empresa) {
        await this.supabase
          .from('logs_esocial')
          .insert({
            empresa_id: empresa.id,
            operacao: 'consulta_funcionarios',
            status,
            descricao,
            detalhes: {
              cnpj: this.config.cnpj,
              timestamp: new Date().toISOString()
            }
          })
      }
    } catch (error) {
      console.error("Erro ao registrar log:", error)
    }
  }
}
