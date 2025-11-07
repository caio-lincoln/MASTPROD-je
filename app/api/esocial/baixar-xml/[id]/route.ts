import { NextRequest, NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const eventoId = params.id

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

    if (!eventoId) {
      return NextResponse.json(
        { error: "ID do evento é obrigatório" },
        { status: 400 }
      )
    }

    // Buscar o evento
    const { data: evento, error } = await supabase
      .from("eventos_esocial")
      .select("id, tipo_evento, xml_url, xml_original")
      .eq("id", eventoId)
      .single()

    if (error) {
      console.error("Erro ao buscar evento:", error)
      return NextResponse.json(
        { error: "Erro ao buscar evento" },
        { status: 500 }
      )
    }

    if (!evento) {
      return NextResponse.json(
        { error: "Evento não encontrado" },
        { status: 404 }
      )
    }

    let xmlContent = null

    // Tentar baixar do storage primeiro
    if (evento.xml_url) {
      try {
        const { data: xmlData } = await supabase.storage
          .from("esocial")
          .download(evento.xml_url)
        
        if (xmlData) {
          xmlContent = await xmlData.text()
        }
      } catch (xmlError) {
        console.error("Erro ao baixar XML do storage:", xmlError)
      }
    }

    // Se não encontrou no storage, usar xml_original
    if (!xmlContent && evento.xml_original) {
      xmlContent = evento.xml_original
    }

    if (!xmlContent) {
      return NextResponse.json(
        { error: "XML não encontrado para este evento" },
        { status: 404 }
      )
    }

    // Log de auditoria do download
    await supabase.from('logs_auditoria').insert({
      user_id: user.id,
      empresa_id: null,
      acao: 'baixar_xml_esocial',
      entidade: 'eventos_esocial',
      entidade_id: eventoId,
      descricao: 'Download de XML do evento do eSocial',
      dados_novos: {
        tipo_evento: evento.tipo_evento,
        origem_xml: evento.xml_url ? 'storage' : (evento.xml_original ? 'original' : 'indisponivel'),
      },
      created_at: new Date().toISOString(),
    })

    // Retornar o XML como download
    const fileName = `evento_${evento.tipo_evento}_${eventoId}.xml`
    
    return new NextResponse(xmlContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    })

  } catch (error) {
    console.error("Erro interno:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
