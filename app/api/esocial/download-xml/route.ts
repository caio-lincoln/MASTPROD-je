import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isUuid, sanitizeString } from '@/lib/security/validation'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const eventoId = searchParams.get('evento_id')

    if (!eventoId) {
      return NextResponse.json(
        { error: 'ID do evento é obrigatório' },
        { status: 400 }
      )
    }

    if (!isUuid(eventoId)) {
      return NextResponse.json(
        { error: 'ID do evento inválido' },
        { status: 400 }
      )
    }

    const supabase = createClient()
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
    
    // Buscar evento
    const { data: evento, error: eventoError } = await supabase
      .from('eventos_esocial')
      .select('*')
      .eq('id', eventoId)
      .single()

    if (eventoError || !evento) {
      console.error('Erro ao buscar evento:', eventoError)
      return NextResponse.json(
        { error: 'Evento não encontrado' },
        { status: 404 }
      )
    }

    // Compatibilidade: usar `xml_url` (EventManager) ou `xml_path` (legado)
    const xmlUrl: string | null = evento.xml_url || null
    const xmlPathLegacy: string | null = evento.xml_path || null

    if (!xmlUrl && !xmlPathLegacy) {
      return NextResponse.json(
        { error: 'XML não disponível para este evento' },
        { status: 404 }
      )
    }

    // Fazer download do XML do storage (bucket "esocial" com `xml_url`)
    let xmlData: Blob | null = null
    let downloadError: any = null

    if (xmlUrl) {
      const { data, error } = await supabase.storage
        .from('esocial')
        .download(xmlUrl)
      xmlData = data
      downloadError = error
    } else if (xmlPathLegacy) {
      // Suporte legado: bucket antigo 'esocial-xmls' com `xml_path`
      const { data, error } = await supabase.storage
        .from('esocial-xmls')
        .download(xmlPathLegacy)
      xmlData = data
      downloadError = error
    }

    if (downloadError || !xmlData) {
      console.error('Erro ao fazer download do XML:', downloadError)
      return NextResponse.json(
        { error: 'Erro ao fazer download do XML' },
        { status: 500 }
      )
    }

    // Converter blob para texto
    const xmlContent = await xmlData.text()

    // Criar log de auditoria (logs_auditoria)
    await supabase
      .from('logs_auditoria')
      .insert({
        user_id: user.id,
        empresa_id: evento.empresa_id || null,
        acao: 'download_xml_esocial',
        entidade: 'eventos_esocial',
        entidade_id: eventoId,
        descricao: 'Download do XML de evento do eSocial',
        dados_novos: {
          xml_url: xmlUrl,
          xml_path_legacy: xmlPathLegacy,
        },
        created_at: new Date().toISOString(),
      })

    // Retornar XML como download
    const safeTipo = sanitizeString(evento.tipo_evento)
    const safeReciboOrId = sanitizeString(evento.numero_recibo || eventoId)
    const fileName = `${safeTipo}_${safeReciboOrId}.xml`
    
    return new NextResponse(xmlContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-cache'
      }
    })

  } catch (error) {
    console.error('Erro ao fazer download do XML:', error)
    
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}
