import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { EsocialService } from '@/lib/esocial/esocial-service'
import { EsocialEventManager } from '@/lib/esocial/event-manager'

export async function POST(request: NextRequest) {
  try {
    const { eventoIds } = await request.json()

    if (!eventoIds || !Array.isArray(eventoIds) || eventoIds.length === 0) {
      return NextResponse.json(
        { error: 'IDs dos eventos são obrigatórios' },
        { status: 400 }
      )
    }

    const supabase = createClient()
    
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

    // Buscar certificado digital
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