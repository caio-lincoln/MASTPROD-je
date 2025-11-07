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

    // Autenticação obrigatória para chamadas externas (não internas)
    let userId: string | null = null
    if (!isInternalJob) {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()
      if (authError) {
        console.error('Erro de autenticação:', authError)
      }
      if (!user) {
        return NextResponse.json(
          { error: 'Não autorizado. Faça login para continuar.' },
          { status: 401 }
        )
      }
      userId = user.id
    }
    
    // Verificar se todos os eventos existem
    const { data: eventos, error: eventosError } = await supabase
      .from('eventos_esocial')
      .select('*')
      .in('id', eventoIds)

    if (eventosError) {
      console.error('Erro ao buscar eventos:', eventosError)
      return NextResponse.json(
        { error: 'Erro ao buscar eventos' },
        { status: 500 }
      )
    }

    if (!eventos || eventos.length !== eventoIds.length) {
      return NextResponse.json(
        { error: 'Alguns eventos não foram encontrados' },
        { status: 400 }
      )
    }

    // Inferir empresa_id se todos os eventos forem da mesma empresa
    const empresas = new Set(eventos.map((e: any) => e.empresa_id))
    const empresaId = empresas.size === 1 ? (Array.from(empresas)[0] as string) : null

    // Se estiver habilitado para Edge, delega o enfileiramento do lote
    if (useEdgeProcessing && !forceSync) {
      const empresasEdge = new Set(eventos.map((e: any) => e.empresa_id))
      if (empresasEdge.size !== 1) {
        return NextResponse.json(
          { error: 'Todos os eventos do lote devem pertencer à mesma empresa' },
          { status: 400 }
        )
      }
      const [empresaId] = Array.from(empresasEdge)

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

    if (!empresaId) {
      return NextResponse.json(
        { error: 'Os eventos devem pertencer à mesma empresa para processamento em lote' },
        { status: 400 }
      )
    }

    // Criar lote de eventos
    const lote = await eventManager.criarLoteEventos(eventoIds, empresaId)

    // Atualizar status dos eventos para "processando"
    await supabase
      .from('eventos_esocial')
      .update({ 
        status: 'processando',
        updated_at: new Date().toISOString()
      })
      .in('id', eventoIds)
      .eq('empresa_id', empresaId)

    // Processar lote
    const resultado = await esocialService.processarLoteEventos(eventoIds, empresaId, certificado?.senha)

    // Criar log de auditoria (logs_auditoria)
    await supabase
      .from('logs_auditoria')
      .insert({
        user_id: userId,
        empresa_id: empresaId,
        acao: 'processar_lote_esocial',
        entidade: 'eventos_esocial',
        entidade_id: lote.id,
        descricao: 'Processamento de lote de eventos do eSocial',
        dados_novos: {
          eventos_processados: eventoIds.length,
          resultado: resultado,
        },
        created_at: new Date().toISOString(),
      })

    return NextResponse.json({
      success: true,
      loteId: lote.id,
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
