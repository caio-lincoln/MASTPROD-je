import type { EsocialConfig } from "./types"

export interface SoapResponse {
  sucesso: boolean
  protocolo?: string
  codigo_resposta?: string
  descricao_resposta?: string
  xml_retorno?: string
  erros?: Array<{
    codigo: string
    descricao: string
    tipo: "erro" | "aviso"
  }>
}

export interface ConsultaLoteResponse extends SoapResponse {
  status_lote?: "Processado" | "Processando" | "Erro"
  eventos_processados?: number
  eventos_erro?: number
  eventos_sucesso?: number
}

export class EsocialSoapClient {
  private config: EsocialConfig

  constructor(config: EsocialConfig) {
    this.config = config
  }

  // Enviar lote de eventos para o eSocial
  async enviarLoteEventos(xmlLote: string): Promise<SoapResponse> {
    try {
      const soapEnvelope = this.criarEnvelopeEnvioLote(xmlLote)

      const response = await fetch(this.config.urls.recepcaoLote, {
        method: "POST",
        headers: {
          "Content-Type": "text/xml; charset=utf-8",
          SOAPAction:
            "http://www.esocial.gov.br/servicos/empregador/lote/eventos/envio/v1_1_1/ServicoEnviarLoteEventos/EnviarLoteEventos",
          "User-Agent": "SST-System/1.0",
        },
        body: soapEnvelope,
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const xmlResponse = await response.text()
      return this.parseEnvioLoteResponse(xmlResponse)
    } catch (error) {
      return {
        sucesso: false,
        erros: [
          {
            codigo: "SOAP_ERROR",
            descricao: error instanceof Error ? error.message : "Erro na comunicação SOAP",
            tipo: "erro",
          },
        ],
      }
    }
  }

  // Consultar status de lote enviado
  async consultarLoteEventos(protocolo: string): Promise<ConsultaLoteResponse> {
    try {
      const soapEnvelope = this.criarEnvelopeConsultaLote(protocolo)

      const response = await fetch(this.config.urls.consultaLote, {
        method: "POST",
        headers: {
          "Content-Type": "text/xml; charset=utf-8",
          SOAPAction:
            "http://www.esocial.gov.br/servicos/empregador/lote/eventos/envio/v1_1_1/ServicoConsultarLoteEventos/ConsultarLoteEventos",
          "User-Agent": "SST-System/1.0",
        },
        body: soapEnvelope,
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const xmlResponse = await response.text()
      return this.parseConsultaLoteResponse(xmlResponse)
    } catch (error) {
      return {
        sucesso: false,
        erros: [
          {
            codigo: "SOAP_ERROR",
            descricao: error instanceof Error ? error.message : "Erro na consulta SOAP",
            tipo: "erro",
          },
        ],
      }
    }
  }

  // Download de evento processado
  async downloadEvento(numeroRecibo: string): Promise<SoapResponse> {
    try {
      const soapEnvelope = this.criarEnvelopeDownloadEvento(numeroRecibo)

      const response = await fetch(this.config.urls.downloadEvento, {
        method: "POST",
        headers: {
          "Content-Type": "text/xml; charset=utf-8",
          SOAPAction:
            "http://www.esocial.gov.br/servicos/empregador/download/solicitacao/v1_0_0/ServicoSolicitarDownloadEventos/SolicitarDownloadEventos",
          "User-Agent": "SST-System/1.0",
        },
        body: soapEnvelope,
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const xmlResponse = await response.text()
      return this.parseDownloadEventoResponse(xmlResponse)
    } catch (error) {
      return {
        sucesso: false,
        erros: [
          {
            codigo: "SOAP_ERROR",
            descricao: error instanceof Error ? error.message : "Erro no download SOAP",
            tipo: "erro",
          },
        ],
      }
    }
  }

  // Criar envelope SOAP para envio de lote
  private criarEnvelopeEnvioLote(xmlLote: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" 
               xmlns:v1="http://www.esocial.gov.br/servicos/empregador/lote/eventos/envio/v1_1_1">
  <soap:Header />
  <soap:Body>
    <v1:EnviarLoteEventos>
      <v1:loteEventos>${this.escaparXML(xmlLote)}</v1:loteEventos>
    </v1:EnviarLoteEventos>
  </soap:Body>
</soap:Envelope>`
  }

  // Criar envelope SOAP para consulta de lote
  private criarEnvelopeConsultaLote(protocolo: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" 
               xmlns:v1="http://www.esocial.gov.br/servicos/empregador/lote/eventos/envio/v1_1_1">
  <soap:Header />
  <soap:Body>
    <v1:ConsultarLoteEventos>
      <v1:consulta>
        <v1:ideEmpregador>
          <v1:tpInsc>1</v1:tpInsc>
          <v1:nrInsc>${this.config.cnpj}</v1:nrInsc>
        </v1:ideEmpregador>
        <v1:protocolo>${protocolo}</v1:protocolo>
      </v1:consulta>
    </v1:ConsultarLoteEventos>
  </soap:Body>
</soap:Envelope>`
  }

  // Criar envelope SOAP para download de evento
  private criarEnvelopeDownloadEvento(numeroRecibo: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" 
               xmlns:v1="http://www.esocial.gov.br/servicos/empregador/download/solicitacao/v1_0_0">
  <soap:Header />
  <soap:Body>
    <v1:SolicitarDownloadEventos>
      <v1:solicita>
        <v1:ideEmpregador>
          <v1:tpInsc>1</v1:tpInsc>
          <v1:nrInsc>${this.config.cnpj}</v1:nrInsc>
        </v1:ideEmpregador>
        <v1:solicDownload>
          <v1:nrRec>${numeroRecibo}</v1:nrRec>
        </v1:solicDownload>
      </v1:solicita>
    </v1:SolicitarDownloadEventos>
  </soap:Body>
</soap:Envelope>`
  }

  // Parse da resposta de envio de lote
  private parseEnvioLoteResponse(xmlResponse: string): SoapResponse {
    try {
      // Extrair dados da resposta SOAP (implementação simplificada)
      const protocoloMatch = xmlResponse.match(/<protocolo>([^<]+)<\/protocolo>/i)
      const codigoMatch = xmlResponse.match(/<cdResposta>([^<]+)<\/cdResposta>/i)
      const descricaoMatch = xmlResponse.match(/<descResposta>([^<]+)<\/descResposta>/i)

      const protocolo = protocoloMatch?.[1]
      const codigo = codigoMatch?.[1]
      const descricao = descricaoMatch?.[1]

      // Verificar se houve sucesso (código 201 = sucesso)
      const sucesso = codigo === "201"

      const response: SoapResponse = {
        sucesso,
        protocolo,
        codigo_resposta: codigo,
        descricao_resposta: descricao,
        xml_retorno: xmlResponse,
      }

      // Extrair erros se houver
      if (!sucesso) {
        response.erros = this.extrairErrosDoXML(xmlResponse)
      }

      return response
    } catch (error) {
      return {
        sucesso: false,
        erros: [
          {
            codigo: "PARSE_ERROR",
            descricao: "Erro ao processar resposta do eSocial",
            tipo: "erro",
          },
        ],
      }
    }
  }

  // Parse da resposta de consulta de lote
  private parseConsultaLoteResponse(xmlResponse: string): ConsultaLoteResponse {
    try {
      const statusMatch = xmlResponse.match(/<situacao>([^<]+)<\/situacao>/i)
      const processadosMatch = xmlResponse.match(/<qtdEventosProcessados>([^<]+)<\/qtdEventosProcessados>/i)
      const errosMatch = xmlResponse.match(/<qtdEventosComErro>([^<]+)<\/qtdEventosComErro>/i)

      const status = statusMatch?.[1] as "Processado" | "Processando" | "Erro"
      const processados = Number.parseInt(processadosMatch?.[1] || "0")
      const comErro = Number.parseInt(errosMatch?.[1] || "0")

      return {
        sucesso: true,
        status_lote: status,
        eventos_processados: processados,
        eventos_erro: comErro,
        eventos_sucesso: processados - comErro,
        xml_retorno: xmlResponse,
      }
    } catch (error) {
      return {
        sucesso: false,
        erros: [
          {
            codigo: "PARSE_ERROR",
            descricao: "Erro ao processar consulta do eSocial",
            tipo: "erro",
          },
        ],
      }
    }
  }

  // Parse da resposta de download de evento
  private parseDownloadEventoResponse(xmlResponse: string): SoapResponse {
    try {
      // Extrair arquivo compactado da resposta
      const arquivoMatch = xmlResponse.match(/<arquivo>([^<]+)<\/arquivo>/i)
      const arquivo = arquivoMatch?.[1]

      if (arquivo) {
        // Decodificar base64 e descompactar (implementação simplificada)
        const xmlDecodificado = Buffer.from(arquivo, "base64").toString("utf-8")

        return {
          sucesso: true,
          xml_retorno: xmlDecodificado,
        }
      }

      return {
        sucesso: false,
        erros: [
          {
            codigo: "NO_FILE",
            descricao: "Arquivo não encontrado na resposta",
            tipo: "erro",
          },
        ],
      }
    } catch (error) {
      return {
        sucesso: false,
        erros: [
          {
            codigo: "PARSE_ERROR",
            descricao: "Erro ao processar download do eSocial",
            tipo: "erro",
          },
        ],
      }
    }
  }

  // Extrair erros do XML de resposta
  private extrairErrosDoXML(xmlResponse: string): Array<{
    codigo: string
    descricao: string
    tipo: "erro" | "aviso"
  }> {
    const erros: Array<{ codigo: string; descricao: string; tipo: "erro" | "aviso" }> = []

    // Buscar por elementos de erro (implementação simplificada)
    const erroRegex = /<erro>[\s\S]*?<codigo>([^<]+)<\/codigo>[\s\S]*?<descricao>([^<]+)<\/descricao>[\s\S]*?<\/erro>/gi
    let match

    while ((match = erroRegex.exec(xmlResponse)) !== null) {
      erros.push({
        codigo: match[1],
        descricao: match[2],
        tipo: "erro",
      })
    }

    // Buscar por avisos
    const avisoRegex =
      /<aviso>[\s\S]*?<codigo>([^<]+)<\/codigo>[\s\S]*?<descricao>([^<]+)<\/descricao>[\s\S]*?<\/aviso>/gi

    while ((match = avisoRegex.exec(xmlResponse)) !== null) {
      erros.push({
        codigo: match[1],
        descricao: match[2],
        tipo: "aviso",
      })
    }

    return erros
  }

  // Escapar XML para SOAP
  private escaparXML(xml: string): string {
    return xml
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;")
  }

  // Validar conectividade com eSocial
  async testarConectividade(): Promise<{ conectado: boolean; erro?: string }> {
    try {
      // Fazer uma requisição simples para testar conectividade
      const response = await fetch(this.config.urls.recepcaoLote, {
        method: "HEAD",
      })

      return {
        conectado: response.status < 500,
      }
    } catch (error) {
      return {
        conectado: false,
        erro: error instanceof Error ? error.message : "Erro de conectividade",
      }
    }
  }
}
