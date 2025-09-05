import { createClient } from "@/lib/supabase/client"
import { EsocialXmlBuilder } from "./xml-builder"
import type { EventoEsocial, LoteEventos } from "./types"

export class EsocialEventManager {
  private supabase = createClient()
  private xmlBuilder = new EsocialXmlBuilder()

  // Criar evento S-2220 a partir de exame ASO
  async criarEventoS2220(exame_id: string, empresa_id: string): Promise<EventoEsocial> {
    try {
      // Gerar XML do evento
      const xmlOriginal = await this.xmlBuilder.gerarS2220FromExame(exame_id, empresa_id)

      // Salvar evento no banco
      const { data: evento, error } = await this.supabase
        .from("eventos_esocial")
        .insert({
          empresa_id,
          tipo_evento: "S-2220",
          status: "preparando",
          xml_original: xmlOriginal,
          funcionario_id: exame_id, // Referência ao exame
        })
        .select()
        .single()

      if (error) throw error

      // Upload do XML para storage
      const xmlFileName = `s2220_${evento.id}_${Date.now()}.xml`
      await this.uploadXmlToStorage(xmlFileName, xmlOriginal, empresa_id)

      // Atualizar com URL do arquivo
      await this.supabase.from("eventos_esocial").update({ arquivo_url: xmlFileName }).eq("id", evento.id)

      return evento
    } catch (error) {
      throw new Error(`Erro ao criar evento S-2220: ${error instanceof Error ? error.message : "Erro desconhecido"}`)
    }
  }

  // Criar evento S-2240 a partir de funcionário
  async criarEventoS2240(funcionario_id: string, empresa_id: string): Promise<EventoEsocial> {
    try {
      const xmlOriginal = await this.xmlBuilder.gerarS2240FromFuncionario(funcionario_id, empresa_id)

      const { data: evento, error } = await this.supabase
        .from("eventos_esocial")
        .insert({
          empresa_id,
          tipo_evento: "S-2240",
          status: "preparando",
          xml_original: xmlOriginal,
          funcionario_id,
        })
        .select()
        .single()

      if (error) throw error

      const xmlFileName = `s2240_${evento.id}_${Date.now()}.xml`
      await this.uploadXmlToStorage(xmlFileName, xmlOriginal, empresa_id)

      await this.supabase.from("eventos_esocial").update({ arquivo_url: xmlFileName }).eq("id", evento.id)

      return evento
    } catch (error) {
      throw new Error(`Erro ao criar evento S-2240: ${error instanceof Error ? error.message : "Erro desconhecido"}`)
    }
  }

  // Criar evento S-2210 a partir de incidente
  async criarEventoS2210(incidente_id: string, empresa_id: string): Promise<EventoEsocial> {
    try {
      const xmlOriginal = await this.xmlBuilder.gerarS2210FromIncidente(incidente_id, empresa_id)

      const { data: evento, error } = await this.supabase
        .from("eventos_esocial")
        .insert({
          empresa_id,
          tipo_evento: "S-2210",
          status: "preparando",
          xml_original: xmlOriginal,
          funcionario_id: incidente_id, // Referência ao incidente
        })
        .select()
        .single()

      if (error) throw error

      const xmlFileName = `s2210_${evento.id}_${Date.now()}.xml`
      await this.uploadXmlToStorage(xmlFileName, xmlOriginal, empresa_id)

      await this.supabase.from("eventos_esocial").update({ arquivo_url: xmlFileName }).eq("id", evento.id)

      return evento
    } catch (error) {
      throw new Error(`Erro ao criar evento S-2210: ${error instanceof Error ? error.message : "Erro desconhecido"}`)
    }
  }

  // Criar lote de eventos
  async criarLoteEventos(evento_ids: string[], empresa_id: string): Promise<LoteEventos> {
    try {
      // Criar lote
      const { data: lote, error: loteError } = await this.supabase
        .from("esocial_lotes")
        .insert({
          empresa_id,
          status: "preparando",
          total_eventos: evento_ids.length,
        })
        .select()
        .single()

      if (loteError) throw loteError

      // Associar eventos ao lote
      const { error: updateError } = await this.supabase
        .from("eventos_esocial")
        .update({ lote_id: lote.id })
        .in("id", evento_ids)
        .eq("empresa_id", empresa_id)

      if (updateError) throw updateError

      // Buscar eventos do lote
      const { data: eventos } = await this.supabase.from("eventos_esocial").select("*").eq("lote_id", lote.id)

      return {
        ...lote,
        eventos: eventos || [],
      }
    } catch (error) {
      throw new Error(`Erro ao criar lote: ${error instanceof Error ? error.message : "Erro desconhecido"}`)
    }
  }

  // Listar eventos por empresa
  async listarEventos(
    empresa_id: string,
    filtros?: {
      tipo_evento?: string
      status?: string
      data_inicio?: string
      data_fim?: string
    },
  ): Promise<EventoEsocial[]> {
    let query = this.supabase
      .from("eventos_esocial")
      .select(`
        *,
        funcionarios(nome, cpf),
        esocial_lotes(protocolo, status)
      `)
      .eq("empresa_id", empresa_id)
      .order("created_at", { ascending: false })

    if (filtros?.tipo_evento) {
      query = query.eq("tipo_evento", filtros.tipo_evento)
    }
    if (filtros?.status) {
      query = query.eq("status", filtros.status)
    }
    if (filtros?.data_inicio) {
      query = query.gte("created_at", filtros.data_inicio)
    }
    if (filtros?.data_fim) {
      query = query.lte("created_at", filtros.data_fim)
    }

    const { data, error } = await query

    if (error) throw error
    return data || []
  }

  // Upload de XML para storage
  private async uploadXmlToStorage(fileName: string, xmlContent: string, empresa_id: string): Promise<void> {
    const filePath = `${empresa_id}/${fileName}`

    const { error } = await this.supabase.storage
      .from("esocial")
      .upload(filePath, new Blob([xmlContent], { type: "application/xml" }))

    if (error) throw error
  }

  // Download de XML do storage
  async downloadXmlFromStorage(arquivo_url: string, empresa_id: string): Promise<string> {
    const filePath = `${empresa_id}/${arquivo_url}`

    const { data, error } = await this.supabase.storage.from("esocial").download(filePath)

    if (error) throw error
    return await data.text()
  }

  // Atualizar status do evento
  async atualizarStatusEvento(
    evento_id: string,
    status: string,
    dados?: {
      protocolo?: string
      numero_recibo?: string
      retorno_xml?: string
      erros?: string[]
    },
  ): Promise<void> {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    }

    if (dados?.protocolo) updateData.protocolo = dados.protocolo
    if (dados?.numero_recibo) updateData.numero_recibo = dados.numero_recibo
    if (dados?.retorno_xml) updateData.retorno_xml = dados.retorno_xml
    if (dados?.erros) updateData.erros = dados.erros
    if (status === "processado") updateData.data_processamento = new Date().toISOString()

    const { error } = await this.supabase.from("eventos_esocial").update(updateData).eq("id", evento_id)

    if (error) throw error
  }
}
