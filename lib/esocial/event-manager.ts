import { createClient } from "@/lib/supabase/client"
import { EsocialXmlBuilder } from "./xml-builder"
import type { EventoEsocial, LoteEventos } from "./types"

export class EsocialEventManager {
  private supabase = createClient()
  private xmlBuilder = new EsocialXmlBuilder({ ambiente: "producao" })

  // Método para criar logs
  private async criarLog(
    empresa_id: string,
    tipo_log: 'info' | 'success' | 'warning' | 'error',
    operacao: string,
    mensagem: string,
    detalhes?: any,
    evento_id?: string,
    lote_id?: string
  ): Promise<void> {
    try {
      await this.supabase
        .from("esocial_logs")
        .insert({
          empresa_id,
          evento_id,
          lote_id,
          tipo_log,
          operacao,
          mensagem,
          detalhes,
          created_at: new Date().toISOString()
        })
    } catch (error) {
      console.error("Erro ao criar log:", error)
    }
  }

  // Criar evento S-2220 a partir de exame ASO
  async criarEventoS2220(exame_id: string, empresa_id: string): Promise<EventoEsocial> {
    try {
      await this.criarLog(empresa_id, 'info', 'Criar Evento S-2220', `Iniciando criação de evento S-2220 para exame ${exame_id}`)

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

      await this.criarLog(empresa_id, 'success', 'Criar Evento S-2220', `Evento S-2220 criado com sucesso`, { evento_id: evento.id }, evento.id)

      return evento
    } catch (error) {
      await this.criarLog(empresa_id, 'error', 'Criar Evento S-2220', `Erro ao criar evento S-2220: ${error instanceof Error ? error.message : "Erro desconhecido"}`, { exame_id, error: error instanceof Error ? error.message : error })
      throw new Error(`Erro ao criar evento S-2220: ${error instanceof Error ? error.message : "Erro desconhecido"}`)
    }
  }

  // Criar evento S-2240 a partir de funcionário
  async criarEventoS2240(funcionario_id: string, empresa_id: string): Promise<EventoEsocial> {
    try {
      await this.criarLog(empresa_id, 'info', 'Criar Evento S-2240', `Iniciando criação de evento S-2240 para funcionário ${funcionario_id}`)

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

      await this.criarLog(empresa_id, 'success', 'Criar Evento S-2240', `Evento S-2240 criado com sucesso`, { evento_id: evento.id }, evento.id)

      return evento
    } catch (error) {
      await this.criarLog(empresa_id, 'error', 'Criar Evento S-2240', `Erro ao criar evento S-2240: ${error instanceof Error ? error.message : "Erro desconhecido"}`, { funcionario_id, error: error instanceof Error ? error.message : error })
      throw new Error(`Erro ao criar evento S-2240: ${error instanceof Error ? error.message : "Erro desconhecido"}`)
    }
  }

  // Criar evento S-2210 a partir de incidente
  async criarEventoS2210(incidente_id: string, empresa_id: string): Promise<EventoEsocial> {
    try {
      await this.criarLog(empresa_id, 'info', 'Criar Evento S-2210', `Iniciando criação de evento S-2210 para incidente ${incidente_id}`)

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

      await this.criarLog(empresa_id, 'success', 'Criar Evento S-2210', `Evento S-2210 criado com sucesso`, { evento_id: evento.id }, evento.id)

      return evento
    } catch (error) {
      await this.criarLog(empresa_id, 'error', 'Criar Evento S-2210', `Erro ao criar evento S-2210: ${error instanceof Error ? error.message : "Erro desconhecido"}`, { incidente_id, error: error instanceof Error ? error.message : error })
      throw new Error(`Erro ao criar evento S-2210: ${error instanceof Error ? error.message : "Erro desconhecido"}`)
    }
  }

  // Criar lote de eventos
  async criarLoteEventos(evento_ids: string[], empresa_id: string): Promise<LoteEventos> {
    try {
      await this.criarLog(empresa_id, 'info', 'Criar Lote', `Iniciando criação de lote com ${evento_ids.length} eventos`)

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

      await this.criarLog(empresa_id, 'success', 'Criar Lote', `Lote criado com sucesso com ${evento_ids.length} eventos`, { lote_id: lote.id }, undefined, lote.id)

      return {
        ...lote,
        eventos: eventos || [],
      }
    } catch (error) {
      await this.criarLog(empresa_id, 'error', 'Criar Lote', `Erro ao criar lote: ${error instanceof Error ? error.message : "Erro desconhecido"}`, { evento_ids, error: error instanceof Error ? error.message : error })
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

  // Criar evento genérico
  async criarEvento(dados: {
    tipo_evento: string
    empresa_id: string
    funcionario_id?: string
    exame_id?: string
    incidente_id?: string
    xml_content: string
    status: string
    dados_evento?: any
  }): Promise<EventoEsocial> {
    const eventoData = {
      tipo_evento: dados.tipo_evento,
      empresa_id: dados.empresa_id,
      funcionario_id: dados.funcionario_id,
      exame_id: dados.exame_id,
      incidente_id: dados.incidente_id,
      status: dados.status,
      dados_evento: dados.dados_evento,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // Upload do XML para storage
    const fileName = `${dados.tipo_evento}_${Date.now()}.xml`
    await this.uploadXmlToStorage(fileName, dados.xml_content, dados.empresa_id)
    
    // Salvar evento no banco
    const { data: evento, error } = await this.supabase
      .from("eventos_esocial")
      .insert({
        ...eventoData,
        xml_url: `${dados.empresa_id}/${fileName}`,
        xml_original: dados.xml_content
      })
      .select()
      .single()

    if (error) throw error
    return evento
  }

  // Atualizar status de evento
  async atualizarStatusEvento(evento_id: string, status: string, empresa_id: string, detalhes?: any): Promise<void> {
    try {
      await this.criarLog(empresa_id, 'info', 'Atualizar Status', `Atualizando status do evento ${evento_id} para ${status}`)

      const { error } = await this.supabase
        .from("eventos_esocial")
        .update({ 
          status,
          updated_at: new Date().toISOString(),
          ...(detalhes && { detalhes })
        })
        .eq("id", evento_id)
        .eq("empresa_id", empresa_id)

      if (error) throw error

      await this.criarLog(empresa_id, 'success', 'Atualizar Status', `Status do evento atualizado para ${status}`, { status, detalhes }, evento_id)
    } catch (error) {
      await this.criarLog(empresa_id, 'error', 'Atualizar Status', `Erro ao atualizar status: ${error instanceof Error ? error.message : "Erro desconhecido"}`, { evento_id, status, error: error instanceof Error ? error.message : error })
      throw new Error(`Erro ao atualizar status do evento: ${error instanceof Error ? error.message : "Erro desconhecido"}`)
    }
  }
}
