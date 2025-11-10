import { createClient } from "@/lib/supabase/client"
import { EsocialSoapClient } from "./soap-client"
import { DigitalSignatureService } from "./digital-signature"
import { EsocialEventManager } from "./event-manager"
import { getEsocialConfig } from "./config"
import { esocialValidator } from "./validation"

export class EsocialService {
  private supabase = createClient()
  private signatureService = new DigitalSignatureService()
  private eventManager = new EsocialEventManager()

  // Processar e enviar evento completo (XML -> Assinatura -> Envio -> Acompanhamento)
  async processarEventoCompleto(
    evento_id: string,
    empresa_id: string,
    senha_certificado?: string,
  ): Promise<{
    sucesso: boolean
    protocolo?: string
    erro?: string
  }> {
    try {
      // 1. Buscar evento no banco
      const { data: evento, error: eventoError } = await this.supabase
        .from("eventos_esocial")
        .select("*")
        .eq("id", evento_id)
        .eq("empresa_id", empresa_id)
        .single()

      if (eventoError || !evento) {
        return { sucesso: false, erro: "Evento não encontrado" }
      }

      if (!evento.xml_original) {
        return { sucesso: false, erro: "XML original não encontrado" }
      }

      // 2.1 Validação pré-assinatura para S-1000 (retificação, estrutura mínima)
      const isS1000 = /<evtInfoEmpregador[\s>]/.test(evento.xml_original)
      if (isS1000) {
        const preIssues = esocialValidator.validate({ tipoEvento: "S-1000", xml: evento.xml_original })
        const preErrors = preIssues.filter((i) => i.level === "error")
        if (preErrors.length) {
          await this.eventManager.atualizarStatusEvento(evento_id, "erro", empresa_id, {
            erros: preErrors.map((e) => e.message),
            detalhes: { validacao: preIssues },
          })
          return { sucesso: false, erro: preErrors[0].message }
        }
        // Registrar warnings sem bloquear
        if (preIssues.length) {
          await this.eventManager.atualizarStatusEvento(evento_id, "preparando", empresa_id, {
            detalhes: { avisos_validacao: preIssues },
          })
        }
      }

      // 2. Assinar XML digitalmente
      const assinaturaResult = await this.signatureService.assinarXML(
        evento.xml_original,
        empresa_id,
        senha_certificado,
      )

      if (!assinaturaResult.sucesso) {
        await this.eventManager.atualizarStatusEvento(evento_id, "erro", empresa_id, {
          erros: [assinaturaResult.erro || "Erro na assinatura"],
        })
        return { sucesso: false, erro: assinaturaResult.erro }
      }

      // 3. Atualizar evento com XML assinado
      await this.supabase
        .from("eventos_esocial")
        .update({
          xml_assinado: assinaturaResult.xml_assinado,
          status: "preparando",
        })
        .eq("id", evento_id)

      // 3.1 Validação pós-assinatura: algoritmos de assinatura e XSD (S-1000)
      if (isS1000 && assinaturaResult.xml_assinado) {
        const postIssues = esocialValidator.validate({ tipoEvento: "S-1000", xml: assinaturaResult.xml_assinado })
        const postErrors = postIssues.filter((i) => i.level === "error")
        if (postErrors.length) {
          await this.eventManager.atualizarStatusEvento(evento_id, "erro", empresa_id, {
            erros: postErrors.map((e) => e.message),
            detalhes: { validacao_assinatura: postIssues },
          })
          return { sucesso: false, erro: postErrors[0].message }
        }
        if (postIssues.length) {
          await this.eventManager.atualizarStatusEvento(evento_id, "preparando", empresa_id, {
            detalhes: { avisos_validacao_assinatura: postIssues },
          })
        }
      }

      // 4. Configurar cliente SOAP
      const { data: empresa } = await this.supabase.from("empresas").select("cnpj").eq("id", empresa_id).single()

      if (!empresa) {
        return { sucesso: false, erro: "Empresa não encontrada" }
      }

      const config = getEsocialConfig(empresa.cnpj, "producao")
      const soapClient = new EsocialSoapClient(config)

      // 5. Enviar para eSocial
      const envioResult = await soapClient.enviarLoteEventos(assinaturaResult.xml_assinado!)

      if (!envioResult.sucesso) {
        await this.eventManager.atualizarStatusEvento(evento_id, "erro", empresa_id, {
          erros: envioResult.erros?.map((e) => e.descricao) || ["Erro no envio"],
        })
        return { sucesso: false, erro: envioResult.erros?.[0]?.descricao || "Erro no envio" }
      }

      // 6. Atualizar evento com protocolo
      await this.eventManager.atualizarStatusEvento(evento_id, "enviado", empresa_id, {
        protocolo: envioResult.protocolo,
        retorno_xml: envioResult.xml_retorno,
      })

      return {
        sucesso: true,
        protocolo: envioResult.protocolo,
      }
    } catch (error) {
      await this.eventManager.atualizarStatusEvento(evento_id, "erro", {
        erros: [error instanceof Error ? error.message : "Erro desconhecido"],
      })

      return {
        sucesso: false,
        erro: error instanceof Error ? error.message : "Erro desconhecido",
      }
    }
  }

  // Processar lote de eventos
  async processarLoteEventos(
    evento_ids: string[],
    empresa_id: string,
    senha_certificado?: string,
  ): Promise<{
    sucesso: boolean
    protocolo?: string
    eventos_processados: number
    eventos_erro: number
    erro?: string
  }> {
    let eventosProcessados = 0
    let eventosErro = 0

    try {
      // Criar lote
      const lote = await this.eventManager.criarLoteEventos(evento_ids, empresa_id)

      // Processar cada evento do lote
      for (const eventoId of evento_ids) {
        const resultado = await this.processarEventoCompleto(eventoId, empresa_id, senha_certificado)

        if (resultado.sucesso) {
          eventosProcessados++
        } else {
          eventosErro++
        }
      }

      // Atualizar status do lote
      const statusLote = eventosErro === 0 ? "enviado" : eventosErro === evento_ids.length ? "erro" : "enviado"

      await this.supabase
        .from("esocial_lotes")
        .update({
          status: statusLote,
          eventos_processados: eventosProcessados,
          eventos_erro: eventosErro,
          data_envio: new Date().toISOString(),
        })
        .eq("id", lote.id)

      return {
        sucesso: eventosErro < evento_ids.length,
        eventos_processados: eventosProcessados,
        eventos_erro: eventosErro,
      }
    } catch (error) {
      return {
        sucesso: false,
        eventos_processados: eventosProcessados,
        eventos_erro: eventosErro,
        erro: error instanceof Error ? error.message : "Erro no processamento do lote",
      }
    }
  }

  // Consultar status de eventos enviados
  async consultarStatusEventos(empresa_id: string): Promise<void> {
    try {
      // Buscar eventos enviados que ainda não foram processados
      const { data: eventos } = await this.supabase
        .from("eventos_esocial")
        .select("*, esocial_lotes(protocolo)")
        .eq("empresa_id", empresa_id)
        .eq("status", "enviado")
        .not("protocolo", "is", null)

      if (!eventos || eventos.length === 0) return

      // Configurar cliente SOAP
      const { data: empresa } = await this.supabase.from("empresas").select("cnpj").eq("id", empresa_id).single()

      if (!empresa) return

      const config = getEsocialConfig(empresa.cnpj, "producao")
      const soapClient = new EsocialSoapClient(config)

      // Consultar cada protocolo
      for (const evento of eventos) {
        if (!evento.protocolo) continue

        const consultaResult = await soapClient.consultarLoteEventos(evento.protocolo)

        if (consultaResult.sucesso && consultaResult.status_lote) {
          let novoStatus = "enviado"

          if (consultaResult.status_lote === "Processado") {
            novoStatus = "processado"
          } else if (consultaResult.status_lote === "Erro") {
            novoStatus = "erro"
          }

          await this.eventManager.atualizarStatusEvento(evento.id, novoStatus, empresa_id, {
            retorno_xml: consultaResult.xml_retorno,
          })
        }
      }
    } catch (error) {
      console.error("Erro ao consultar status dos eventos:", error)
    }
  }

  // Consultar status de um evento específico por número de recibo
  async consultarStatusEvento(numeroRecibo: string): Promise<{
    processado: boolean
    sucesso: boolean
    numero_recibo?: string
    erros?: string[]
    data_processamento?: string
  }> {
    try {
      // Buscar empresa pelo número de recibo (assumindo que o número de recibo está associado a um evento)
      const { data: evento } = await this.supabase
        .from("eventos_esocial")
        .select("empresa_id, empresas(cnpj)")
        .eq("numero_recibo", numeroRecibo)
        .single()

      if (!evento || !evento.empresas) {
        throw new Error("Evento ou empresa não encontrada para o número de recibo")
      }

      const config = getEsocialConfig(evento.empresas.cnpj, "producao")
      const soapClient = new EsocialSoapClient(config)

      const consultaResult = await soapClient.consultarLoteEventos(numeroRecibo)

      if (!consultaResult.sucesso) {
        return {
          processado: false,
          sucesso: false,
          erros: consultaResult.erros?.map(e => e.descricao) || ["Erro na consulta"]
        }
      }

      const processado = consultaResult.status_lote === "Processado" || consultaResult.status_lote === "Erro"
      const sucesso = consultaResult.status_lote === "Processado"

      return {
        processado,
        sucesso,
        numero_recibo: consultaResult.numero_recibo,
        erros: consultaResult.erros?.map(e => e.descricao),
        data_processamento: processado ? new Date().toISOString() : undefined
      }

    } catch (error) {
      console.error("Erro ao consultar status do evento:", error)
      return {
        processado: false,
        sucesso: false,
        erros: [error instanceof Error ? error.message : "Erro desconhecido"]
      }
    }
  }

  // Gerar relatório de eventos eSocial
  async gerarRelatorioEventos(
    empresa_id: string,
    filtros?: {
      data_inicio?: string
      data_fim?: string
      tipo_evento?: string
      status?: string
    },
  ): Promise<{
    total_eventos: number
    eventos_enviados: number
    eventos_processados: number
    eventos_erro: number
    eventos_por_tipo: Record<string, number>
    eventos_por_status: Record<string, number>
  }> {
    try {
      let query = this.supabase
        .from("eventos_esocial")
        .select("tipo_evento, status, created_at")
        .eq("empresa_id", empresa_id)

      if (filtros?.data_inicio) {
        query = query.gte("created_at", filtros.data_inicio)
      }
      if (filtros?.data_fim) {
        query = query.lte("created_at", filtros.data_fim)
      }
      if (filtros?.tipo_evento) {
        query = query.eq("tipo_evento", filtros.tipo_evento)
      }
      if (filtros?.status) {
        query = query.eq("status", filtros.status)
      }

      const { data: eventos } = await query

      if (!eventos) {
        return {
          total_eventos: 0,
          eventos_enviados: 0,
          eventos_processados: 0,
          eventos_erro: 0,
          eventos_por_tipo: {},
          eventos_por_status: {},
        }
      }

      // Calcular estatísticas
      const total = eventos.length
      const enviados = eventos.filter((e) => e.status === "enviado").length
      const processados = eventos.filter((e) => e.status === "processado").length
      const erros = eventos.filter((e) => e.status === "erro").length

      const porTipo = eventos.reduce(
        (acc, evento) => {
          acc[evento.tipo_evento] = (acc[evento.tipo_evento] || 0) + 1
          return acc
        },
        {} as Record<string, number>,
      )

      const porStatus = eventos.reduce(
        (acc, evento) => {
          acc[evento.status] = (acc[evento.status] || 0) + 1
          return acc
        },
        {} as Record<string, number>,
      )

      return {
        total_eventos: total,
        eventos_enviados: enviados,
        eventos_processados: processados,
        eventos_erro: erros,
        eventos_por_tipo: porTipo,
        eventos_por_status: porStatus,
      }
    } catch (error) {
      throw new Error(`Erro ao gerar relatório: ${error instanceof Error ? error.message : "Erro desconhecido"}`)
    }
  }

  // Testar conectividade com eSocial
  async testarConectividade(empresa_id: string): Promise<{
    conectado: boolean
    ambiente: string
    erro?: string
  }> {
    try {
      const { data: empresa } = await this.supabase.from("empresas").select("cnpj").eq("id", empresa_id).single()

      if (!empresa) {
        return { conectado: false, ambiente: "N/A", erro: "Empresa não encontrada" }
      }

      const config = getEsocialConfig(empresa.cnpj, "producao")
      const soapClient = new EsocialSoapClient(config)

      const teste = await soapClient.testarConectividade()

      return {
        conectado: teste.conectado,
        ambiente: config.ambiente,
        erro: teste.erro,
      }
    } catch (error) {
      return {
        conectado: false,
        ambiente: "N/A",
        erro: error instanceof Error ? error.message : "Erro desconhecido",
      }
    }
  }
}

export { EsocialService as ESocialService }
