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
    
    // Buscar evento
    const { data: evento, error: eventoError } = await supabase
      .from('esocial_eventos')
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

    if (!evento.xml_path) {
      return NextResponse.json(
        { error: 'XML não disponível para este evento' },
        { status: 404 }
      )
    }

    // Fazer download do XML do storage
    const { data: xmlData, error: downloadError } = await supabase.storage
      .from('esocial-xmls')
      .download(evento.xml_path)

    if (downloadError || !xmlData) {
      console.error('Erro ao fazer download do XML:', downloadError)
      return NextResponse.json(
        { error: 'Erro ao fazer download do XML' },
        { status: 500 }
      )
    }

    // Converter blob para texto
    const xmlContent = await xmlData.text()

    // Criar log de auditoria
    await supabase
      .from('audit_logs')
      .insert({
        user_id: 'system',
        action: 'download_xml_esocial',
        table_name: 'esocial_eventos',
        record_id: eventoId,
        changes: {
          xml_path: evento.xml_path
        },
        created_at: new Date().toISOString()
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