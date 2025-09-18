import { EsocialConfig } from "./types"
import { createEsocialFetchOptions } from "./ssl-config"

export interface ConsultaEventosResponse {
  sucesso: boolean
  eventos: EventoFuncionario[]
  erros?: Array<{
    codigo: string
    descricao: string
    tipo: "erro" | "aviso"
  }>
}

export interface EventoFuncionario {
  id: string
  tipo: "S-2200" | "S-2206" | "S-2299" | "S-2300" | "S-2399"
  cpf: string
  nome: string
  matricula?: string
  cargo?: string
  categoria?: string
  data_admissao?: string
  data_desligamento?: string
  situacao: "Ativo" | "Desligado"
  xml_original: string
  data_evento: string
  numero_recibo: string
}

export class EsocialConsultaFuncionarios {
  private config: EsocialConfig

  constructor(config: EsocialConfig) {
    this.config = config
  }

  /**
   * Consulta eventos de funcionários no eSocial
   * @param dataInicio Data inicial para consulta (YYYY-MM-DD)
   * @param dataFim Data final para consulta (YYYY-MM-DD)
   * @param tiposEvento Tipos de eventos a consultar (padrão: todos os relacionados a funcionários)
   */
  async consultarEventosFuncionarios(
    dataInicio: string,
    dataFim: string,
    tiposEvento: string[] = ["S-2200", "S-2206", "S-2299", "S-2300", "S-2399"]
  ): Promise<ConsultaEventosResponse> {
    try {
      const eventos: EventoFuncionario[] = []
      
      // Consultar cada tipo de evento
      for (const tipoEvento of tiposEvento) {
        const eventosDoTipo = await this.consultarEventosPorTipo(
          tipoEvento,
          dataInicio,
          dataFim
        )
        eventos.push(...eventosDoTipo)
      }

      return {
        sucesso: true,
        eventos: eventos.sort((a, b) => 
          new Date(a.data_evento).getTime() - new Date(b.data_evento).getTime()
        )
      }
    } catch (error) {
      console.error("Erro ao consultar eventos de funcionários:", error)
      return {
        sucesso: false,
        eventos: [],
        erros: [{
          codigo: "CONSULTA_ERRO",
          descricao: error instanceof Error ? error.message : "Erro desconhecido",
          tipo: "erro"
        }]
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
  ): Promise<EventoFuncionario[]> {
    const soapEnvelope = this.criarEnvelopeConsultaEventos(
      tipoEvento,
      dataInicio,
      dataFim
    )

    const fetchOptions = createEsocialFetchOptions('POST', soapEnvelope, {
      SOAPAction: "http://www.esocial.gov.br/servicos/empregador/consulta/eventos/v1_0_0/ServicoConsultarEventos/ConsultarEventos",
    })

    const response = await fetch(this.config.urls.consultaEventos, fetchOptions)

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
   * Faz parse da resposta de consulta de eventos
   */
  private parseConsultaEventosResponse(
    xmlResponse: string,
    tipoEvento: string
  ): EventoFuncionario[] {
    const eventos: EventoFuncionario[] = []

    try {
      // Parse básico do XML - em produção, usar um parser XML robusto
      const parser = new DOMParser()
      const doc = parser.parseFromString(xmlResponse, "text/xml")

      // Buscar eventos na resposta
      const eventosNodes = doc.querySelectorAll("evento")

      eventosNodes.forEach((eventoNode) => {
        const evento = this.extrairDadosEvento(eventoNode, tipoEvento)
        if (evento) {
          eventos.push(evento)
        }
      })

      return eventos
    } catch (error) {
      console.error("Erro ao fazer parse da resposta:", error)
      return []
    }
  }

  /**
   * Extrai dados de um evento específico
   */
  private extrairDadosEvento(
    eventoNode: Element,
    tipoEvento: string
  ): EventoFuncionario | null {
    try {
      const id = eventoNode.getAttribute("id") || ""
      const numeroRecibo = eventoNode.querySelector("numeroRecibo")?.textContent || ""
      const dataEvento = eventoNode.querySelector("dataEvento")?.textContent || ""

      // Extrair dados específicos baseado no tipo de evento
      let dadosFuncionario: Partial<EventoFuncionario> = {}

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
        tipo: tipoEvento as any,
        numero_recibo: numeroRecibo,
        data_evento: dataEvento,
        xml_original: eventoNode.outerHTML,
        situacao: tipoEvento === "S-2299" || tipoEvento === "S-2399" ? "Desligado" : "Ativo",
        ...dadosFuncionario
      } as EventoFuncionario

    } catch (error) {
      console.error("Erro ao extrair dados do evento:", error)
      return null
    }
  }

  /**
   * Extrai dados específicos do evento S-2200 (Admissão)
   */
  private extrairDadosS2200(eventoNode: Element): Partial<EventoFuncionario> {
    const cpf = eventoNode.querySelector("cpfTrab")?.textContent || ""
    const nome = eventoNode.querySelector("nmTrab")?.textContent || ""
    const matricula = eventoNode.querySelector("matricula")?.textContent || ""
    const cargo = eventoNode.querySelector("codCargo")?.textContent || ""
    const categoria = eventoNode.querySelector("codCateg")?.textContent || ""
    const dataAdmissao = eventoNode.querySelector("dtAdm")?.textContent || ""

    return {
      cpf,
      nome,
      matricula,
      cargo,
      categoria: this.mapearCategoria(categoria),
      data_admissao: dataAdmissao,
      situacao: "Ativo"
    }
  }

  /**
   * Extrai dados específicos do evento S-2206 (Alteração contratual)
   */
  private extrairDadosS2206(eventoNode: Element): Partial<EventoFuncionario> {
    const cpf = eventoNode.querySelector("cpfTrab")?.textContent || ""
    const matricula = eventoNode.querySelector("matricula")?.textContent || ""
    const cargo = eventoNode.querySelector("codCargo")?.textContent || ""
    const categoria = eventoNode.querySelector("codCateg")?.textContent || ""

    return {
      cpf,
      matricula,
      cargo,
      categoria: this.mapearCategoria(categoria),
      situacao: "Ativo"
    }
  }

  /**
   * Extrai dados específicos do evento S-2299 (Desligamento)
   */
  private extrairDadosS2299(eventoNode: Element): Partial<EventoFuncionario> {
    const cpf = eventoNode.querySelector("cpfTrab")?.textContent || ""
    const matricula = eventoNode.querySelector("matricula")?.textContent || ""
    const dataDesligamento = eventoNode.querySelector("dtDeslig")?.textContent || ""

    return {
      cpf,
      matricula,
      data_desligamento: dataDesligamento,
      situacao: "Desligado"
    }
  }

  /**
   * Extrai dados específicos do evento S-2300 (TSV)
   */
  private extrairDadosS2300(eventoNode: Element): Partial<EventoFuncionario> {
    const cpf = eventoNode.querySelector("cpfTrab")?.textContent || ""
    const nome = eventoNode.querySelector("nmTrab")?.textContent || ""
    const categoria = eventoNode.querySelector("codCateg")?.textContent || ""
    const dataInicio = eventoNode.querySelector("dtIniTSV")?.textContent || ""

    return {
      cpf,
      nome,
      categoria: this.mapearCategoria(categoria),
      data_admissao: dataInicio,
      situacao: "Ativo"
    }
  }

  /**
   * Extrai dados específicos do evento S-2399 (Término TSV)
   */
  private extrairDadosS2399(eventoNode: Element): Partial<EventoFuncionario> {
    const cpf = eventoNode.querySelector("cpfTrab")?.textContent || ""
    const dataTermino = eventoNode.querySelector("dtTerm")?.textContent || ""

    return {
      cpf,
      data_desligamento: dataTermino,
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
      "302": "Trabalhador sem vínculo - Avulso",
      // Adicionar mais categorias conforme necessário
    }

    return categorias[codigo] || `Categoria ${codigo}`
  }
}