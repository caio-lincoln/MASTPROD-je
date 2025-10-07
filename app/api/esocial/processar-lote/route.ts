import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getSupabaseUrl, getSupabaseServiceRoleKey } from '@/lib/config/supabase-config'
import { EsocialService } from '@/lib/esocial/esocial-service'
import { EsocialEventManager } from '@/lib/esocial/event-manager'
import { isUuid } from '@/lib/security/validation'

export async function POST(request: NextRequest) {
  try {
    const { eventoIds } = await request.json()

    if (!eventoIds || !Array.isArray(eventoIds) || eventoIds.length === 0) {
      return NextResponse.json(
        { error: 'IDs dos eventos são obrigatórios' },
        { status: 400 }
      )
    }

    // Validar formato UUID dos IDs
    const allValidUuids = eventoIds.every((id: any) => typeof id === 'string' && isUuid(id))
    if (!allValidUuids) {
      return NextResponse.json(
        { error: 'IDs dos eventos inválidos' },
        { status: 400 }
      )
    }

    const isInternalJob = request.headers.get('x-internal-job') === 'true'
    const supabase = isInternalJob
      ? createAdminClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), { auth: { autoRefreshToken: false, persistSession: false } })
      : createClient()
    const useEdgeProcessing = process.env.USE_EDGE_PROCESSING === 'true'
    const forceSync = request.headers.get('x-force-sync') === 'true'
    
    // Verificar se todos os eventos existem e estão pendentes
    const { data: eventos, error: eventosError } = await supabase
      .from('esocial_eventos')
      .select('*')
      .in('id', eventoIds)
      .eq('status', 'pendente')

    if (eventosError) {
      console.error('Erro ao buscar eventos:', eventosError)
      return NextResponse.json(
        { error: 'Erro ao buscar eventos' },
        { status: 500 }
      )
    }

    if (!eventos || eventos.length !== eventoIds.length) {
      return NextResponse.json(
        { error: 'Alguns eventos não foram encontrados ou não estão pendentes' },
        { status: 400 }
      )
    }

    // Se estiver habilitado para Edge, delega o enfileiramento do lote
    if (useEdgeProcessing && !forceSync) {
      const empresas = new Set(eventos.map((e: any) => e.empresa_id))
      if (empresas.size !== 1) {
        return NextResponse.json(
          { error: 'Todos os eventos do lote devem pertencer à mesma empresa' },
          { status: 400 }
        )
      }
      const [empresaId] = Array.from(empresas)

      // Invocar Edge Function para enfileirar o processamento
      const { data: invokeData, error: invokeError } = await supabase.functions.invoke('processar-lote-esocial', {
        body: { empresa_id: empresaId, evento_ids: eventoIds },
      })

      if (invokeError) {
        console.error('Falha ao enfileirar lote na Edge Function:', invokeError)
        return NextResponse.json(
          { error: 'Falha ao enfileirar processamento do lote' },
          { status: 500 }
        )
      }

      return NextResponse.json(
        { success: true, delegated: true, jobId: invokeData?.job_id },
        { status: 202 }
      )
    }

    // Buscar certificado digital (modo síncrono)
    const { data: certificado, error: certificadoError } = await supabase
      .from('certificados_digitais')
      .select('*')
      .eq('ativo', true)
      .single()

    if (certificadoError || !certificado) {
      console.error('Erro ao buscar certificado:', certificadoError)
      return NextResponse.json(
        { error: 'Certificado digital não encontrado ou inativo' },
        { status: 400 }
      )
    }

    const eventManager = new EsocialEventManager()
    const esocialService = new EsocialService()

    // Criar lote de eventos
    const loteId = await eventManager.criarLoteEventos(eventoIds)

    // Atualizar status dos eventos para "processando"
    await supabase
      .from('esocial_eventos')
      .update({ 
        status: 'processando',
        updated_at: new Date().toISOString()
      })
      .in('id', eventoIds)

    // Processar lote
    const resultado = await esocialService.processarLoteEventos(loteId, certificado)

    // Criar log de auditoria
    await supabase
      .from('audit_logs')
      .insert({
        user_id: 'system',
        action: 'processar_lote_esocial',
        table_name: 'esocial_eventos',
        record_id: loteId,
        changes: {
          eventos_processados: eventoIds.length,
          resultado: resultado
        },
        created_at: new Date().toISOString()
      })

    return NextResponse.json({
      success: true,
      loteId,
      eventosProcessados: eventoIds.length,
      resultado
    })

  } catch (error) {
    console.error('Erro ao processar lote eSocial:', error)
    
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}