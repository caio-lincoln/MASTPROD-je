import { EsocialConfig } from "./types"
import { createEsocialFetchOptions } from "./ssl-config"
import { createClient } from "@supabase/supabase-js"

export interface FuncionarioSST {
  cpf: string
  nome: string
  matricula?: string
  cargo?: string
  categoria?: string
  origem_evento: "S-2210" | "S-2220" | "S-2240"
  detalhes: {
    // Para S-2210 (CAT)
    data_acidente?: string
    tipo_acidente?: string
    descricao_acidente?: string
    
    // Para S-2220 (ASO)
    tipo_exame?: string
    data_exame?: string
    resultado?: string
    medico_responsavel?: string
    
    // Para S-2240 (Agentes Nocivos)
    agentes_nocivos?: string[]
    data_inicio?: string
    data_fim?: string
    epi_utilizado?: boolean
  }
  data_evento: string
  numero_recibo?: string
}

export interface ConsultaEventosSSTResponse {
  sucesso: boolean
  funcionarios_sst: FuncionarioSST[]
  total_eventos_processados: number
  eventos_por_tipo: {
    "S-2210": number
    "S-2220": number
    "S-2240": number
  }
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
    data_consulta: string
  }
}

export class EsocialConsultaEventosSST {
  private config: EsocialConfig
  private supabase: ReturnType<typeof createClient>

  constructor(config: EsocialConfig) {
    this.config = config
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }

  /**
   * Consulta eventos SST específicos (S-2210, S-2220, S-2240)
   */
  async consultarEventosSST(
    dataInicio: string,
    dataFim: string
  ): Promise<ConsultaEventosSSTResponse> {
    const tiposEventosSST = ["S-2210", "S-2220", "S-2240"]
    const funcionariosSST: FuncionarioSST[] = []
    const eventosPorTipo = { "S-2210": 0, "S-2220": 0, "S-2240": 0 }
    const erros: Array<{ codigo: string; descricao: string; tipo: "erro" | "aviso" }> = []

    try {
      console.log(`🔍 Iniciando consulta de eventos SST para período: ${dataInicio} a ${dataFim}`)

      for (const tipoEvento of tiposEventosSST) {
        try {
          console.log(`📋 Consultando eventos ${tipoEvento}...`)
          const eventos = await this.consultarEventosPorTipo(tipoEvento, dataInicio, dataFim)
          
          eventosPorTipo[tipoEvento as keyof typeof eventosPorTipo] = eventos.length
          
          for (const evento of eventos) {
            const funcionario = this.extrairDadosFuncionarioSST(evento, tipoEvento as "S-2210" | "S-2220" | "S-2240")
            if (funcionario) {
              funcionariosSST.push(funcionario)
            }
          }
          
          console.log(`✅ ${eventos.length} eventos ${tipoEvento} processados`)
        } catch (error) {
          console.error(`❌ Erro ao consultar eventos ${tipoEvento}:`, error)
          erros.push({
            codigo: "CONSULTA_EVENTO_ERRO",
            descricao: `Erro ao consultar eventos ${tipoEvento}: ${String(error)}`,
            tipo: "erro"
          })
        }
      }

      // Remover duplicatas por CPF (priorizar evento mais recente)
      const funcionariosUnicos = this.removerDuplicatasPorCPF(funcionariosSST)

      return {
        sucesso: true,
        funcionarios_sst: funcionariosUnicos,
        total_eventos_processados: funcionariosSST.length,
        eventos_por_tipo: eventosPorTipo,
        erros: erros.length > 0 ? erros : undefined,
        metadados: {
          cnpj_empresa: this.config.cnpj,
          periodo_consulta: {
            data_inicio: dataInicio,
            data_fim: dataFim
          },
          data_consulta: new Date().toISOString()
        }
      }

    } catch (error) {
      console.error("❌ Erro geral na consulta de eventos SST:", error)
      return {
        sucesso: false,
        funcionarios_sst: [],
        total_eventos_processados: 0,
        eventos_por_tipo: { "S-2210": 0, "S-2220": 0, "S-2240": 0 },
        erros: [{
          codigo: "CONSULTA_SST_ERRO_GERAL",
          descricao: `Erro geral na consulta: ${String(error)}`,
          tipo: "erro"
        }],
        metadados: {
          cnpj_empresa: this.config.cnpj,
          periodo_consulta: {
            data_inicio: dataInicio,
            data_fim: dataFim
          },
          data_consulta: new Date().toISOString()
        }
      }
    }
  }

  /**
   * Consulta eventos de um tipo específico
   */
  private async consultarEventosPorTipo(
    tipoEvento: string,
    dataInicio: string,
    dataFim: string
  ): Promise<any[]> {
    try {
      const envelope = this.criarEnvelopeConsultaEventos(tipoEvento, dataInicio, dataFim)
      const fetchOptions = createEsocialFetchOptions(this.config, envelope)

      const response = await fetch(this.config.urls.consultaEventos, fetchOptions)
      const xmlResponse = await response.text()

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${xmlResponse}`)
      }

      return this.parseConsultaEventosResponse(xmlResponse, tipoEvento)
    } catch (error) {
      console.error(`Erro ao consultar eventos ${tipoEvento}:`, error)
      throw error
    }
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
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:srt="http://www.esocial.gov.br/servicos/empregador/consulta/eventos/v1_0_0">
  <soap:Header />
  <soap:Body>
    <srt:ConsultarEventos>
      <srt:consulta>
        <srt:tipoEvento>${tipoEvento}</srt:tipoEvento>
        <srt:dataInicio>${dataInicio}</srt:dataInicio>
        <srt:dataFim>${dataFim}</srt:dataFim>
      </srt:consulta>
    </srt:ConsultarEventos>
  </soap:Body>
</soap:Envelope>`
  }

  /**
   * Faz parse da resposta XML da consulta de eventos
   */
  private parseConsultaEventosResponse(xmlResponse: string, tipoEvento: string): any[] {
    const eventos: any[] = []
    
    try {
      const parser = new DOMParser()
      const xmlDoc = parser.parseFromString(xmlResponse, "text/xml")
      
      // Buscar por elementos de evento no XML
      const eventNodes = xmlDoc.getElementsByTagName("evento")
      
      for (let i = 0; i < eventNodes.length; i++) {
        const eventoNode = eventNodes[i]
        const dadosEvento = this.extrairDadosEvento(eventoNode, tipoEvento)
        
        if (dadosEvento) {
          eventos.push(dadosEvento)
        }
      }
      
      return eventos
    } catch (error) {
      console.error(`Erro ao fazer parse da resposta XML para ${tipoEvento}:`, error)
      return []
    }
  }

  /**
   * Extrai dados do evento do XML
   */
  private extrairDadosEvento(eventoNode: Element, tipoEvento: string): any | null {
    try {
      switch (tipoEvento) {
        case "S-2210":
          return this.extrairDadosS2210(eventoNode)
        case "S-2220":
          return this.extrairDadosS2220(eventoNode)
        case "S-2240":
          return this.extrairDadosS2240(eventoNode)
        default:
          return null
      }
    } catch (error) {
      console.error(`Erro ao extrair dados do evento ${tipoEvento}:`, error)
      return null
    }
  }

  /**
   * Extrai dados do evento S-2210 (CAT)
   */
  private extrairDadosS2210(eventoNode: Element): any {
    const cpfElement = eventoNode.querySelector("cpfTrab")
    const nomeElement = eventoNode.querySelector("nmTrab")
    const matriculaElement = eventoNode.querySelector("matricula")
    const dataAcidenteElement = eventoNode.querySelector("dtAcid")
    const tipoAcidenteElement = eventoNode.querySelector("tpAcid")
    const descricaoElement = eventoNode.querySelector("dscLesao")

    return {
      cpf: cpfElement?.textContent || "",
      nome: nomeElement?.textContent || "",
      matricula: matriculaElement?.textContent,
      data_acidente: dataAcidenteElement?.textContent,
      tipo_acidente: tipoAcidenteElement?.textContent,
      descricao_acidente: descricaoElement?.textContent,
      xml_original: eventoNode.outerHTML
    }
  }

  /**
   * Extrai dados do evento S-2220 (ASO)
   */
  private extrairDadosS2220(eventoNode: Element): any {
    const cpfElement = eventoNode.querySelector("cpfTrab")
    const nomeElement = eventoNode.querySelector("nmTrab")
    const matriculaElement = eventoNode.querySelector("matricula")
    const tipoExameElement = eventoNode.querySelector("tpExame")
    const dataExameElement = eventoNode.querySelector("dtExm")
    const resultadoElement = eventoNode.querySelector("indResult")
    const medicoElement = eventoNode.querySelector("nmMed")

    return {
      cpf: cpfElement?.textContent || "",
      nome: nomeElement?.textContent || "",
      matricula: matriculaElement?.textContent,
      tipo_exame: tipoExameElement?.textContent,
      data_exame: dataExameElement?.textContent,
      resultado: resultadoElement?.textContent,
      medico_responsavel: medicoElement?.textContent,
      xml_original: eventoNode.outerHTML
    }
  }

  /**
   * Extrai dados do evento S-2240 (Agentes Nocivos)
   */
  private extrairDadosS2240(eventoNode: Element): any {
    const cpfElement = eventoNode.querySelector("cpfTrab")
    const nomeElement = eventoNode.querySelector("nmTrab")
    const matriculaElement = eventoNode.querySelector("matricula")
    const dataInicioElement = eventoNode.querySelector("dtIniCondicao")
    const dataFimElement = eventoNode.querySelector("dtFimCondicao")
    
    // Extrair agentes nocivos
    const agentesElements = eventoNode.querySelectorAll("agNoc")
    const agentesNocivos: string[] = []
    agentesElements.forEach(agente => {
      const codAgente = agente.querySelector("codAgNoc")?.textContent
      if (codAgente) {
        agentesNocivos.push(this.mapearAgenteNocivo(codAgente))
      }
    })

    const epiElement = eventoNode.querySelector("epcEpi")

    return {
      cpf: cpfElement?.textContent || "",
      nome: nomeElement?.textContent || "",
      matricula: matriculaElement?.textContent,
      agentes_nocivos: agentesNocivos,
      data_inicio: dataInicioElement?.textContent,
      data_fim: dataFimElement?.textContent,
      epi_utilizado: epiElement?.textContent === "1",
      xml_original: eventoNode.outerHTML
    }
  }

  /**
   * Mapeia código do agente nocivo para descrição
   */
  private mapearAgenteNocivo(codigo: string): string {
    const agentes: { [key: string]: string } = {
      "01.01.001": "Ruído acima de 85 dB",
      "01.02.001": "Vibração",
      "02.01.001": "Calor",
      "02.02.001": "Frio",
      "03.01.001": "Radiação ionizante",
      "04.01.001": "Benzeno",
      "04.02.001": "Amianto",
      // Adicionar mais conforme necessário
    }
    
    return agentes[codigo] || `Agente nocivo: ${codigo}`
  }

  /**
   * Extrai dados do funcionário a partir do evento SST
   */
  private extrairDadosFuncionarioSST(evento: any, tipoEvento: "S-2210" | "S-2220" | "S-2240"): FuncionarioSST | null {
    if (!evento.cpf || !evento.nome) {
      return null
    }

    const funcionario: FuncionarioSST = {
      cpf: evento.cpf,
      nome: evento.nome,
      matricula: evento.matricula,
      origem_evento: tipoEvento,
      detalhes: {},
      data_evento: new Date().toISOString().split('T')[0],
      numero_recibo: evento.numero_recibo
    }

    // Preencher detalhes específicos por tipo de evento
    switch (tipoEvento) {
      case "S-2210":
        funcionario.detalhes = {
          data_acidente: evento.data_acidente,
          tipo_acidente: evento.tipo_acidente,
          descricao_acidente: evento.descricao_acidente
        }
        funcionario.data_evento = evento.data_acidente || funcionario.data_evento
        break

      case "S-2220":
        funcionario.detalhes = {
          tipo_exame: evento.tipo_exame,
          data_exame: evento.data_exame,
          resultado: evento.resultado,
          medico_responsavel: evento.medico_responsavel
        }
        funcionario.data_evento = evento.data_exame || funcionario.data_evento
        break

      case "S-2240":
        funcionario.detalhes = {
          agentes_nocivos: evento.agentes_nocivos,
          data_inicio: evento.data_inicio,
          data_fim: evento.data_fim,
          epi_utilizado: evento.epi_utilizado
        }
        funcionario.data_evento = evento.data_inicio || funcionario.data_evento
        break
    }

    return funcionario
  }

  /**
   * Remove duplicatas por CPF, mantendo o evento mais recente
   */
  private removerDuplicatasPorCPF(funcionarios: FuncionarioSST[]): FuncionarioSST[] {
    const funcionariosMap = new Map<string, FuncionarioSST>()

    funcionarios.forEach(funcionario => {
      const existente = funcionariosMap.get(funcionario.cpf)
      
      if (!existente || new Date(funcionario.data_evento) > new Date(existente.data_evento)) {
        funcionariosMap.set(funcionario.cpf, funcionario)
      }
    })

    return Array.from(funcionariosMap.values())
  }

  /**
   * Salva funcionários SST no banco de dados
   */
  async salvarFuncionariosSST(funcionarios: FuncionarioSST[], empresaId: string): Promise<void> {
    try {
      for (const funcionario of funcionarios) {
        await this.supabase
          .from('funcionarios_sst')
          .upsert({
            empresa_id: empresaId,
            cpf: funcionario.cpf,
            nome: funcionario.nome,
            matricula: funcionario.matricula,
            cargo: funcionario.cargo,
            categoria: funcionario.categoria,
            origem_evento: funcionario.origem_evento,
            detalhes: funcionario.detalhes,
            data_evento: funcionario.data_evento,
            numero_recibo: funcionario.numero_recibo,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'empresa_id,cpf'
          })
      }
      
      console.log(`✅ ${funcionarios.length} funcionários SST salvos no banco`)
    } catch (error) {
      console.error("❌ Erro ao salvar funcionários SST:", error)
      throw error
    }
  }
}