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

    if (!eventoId) {
      return NextResponse.json(
        { error: "ID do evento é obrigatório" },
        { status: 400 }
      )
    }

    // Buscar o evento com dados relacionados
    const { data: evento, error } = await supabase
      .from("eventos_esocial")
      .select(`
        *,
        funcionarios (
          id,
          nome,
          cpf,
          matricula_esocial
        )
      `)
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

    // Buscar o XML do evento se existir
    let xmlContent = null
    if (evento.xml_url) {
      try {
        const { data: xmlData } = await supabase.storage
          .from("esocial")
          .download(evento.xml_url)
        
        if (xmlData) {
          xmlContent = await xmlData.text()
        }
      } catch (xmlError) {
        console.error("Erro ao buscar XML:", xmlError)
        // Não falha se não conseguir buscar o XML
      }
    }

    // Se não encontrou no storage, usar xml_original
    if (!xmlContent && evento.xml_original) {
      xmlContent = evento.xml_original
    }

    return NextResponse.json({
      evento: {
        ...evento,
        xml_content: xmlContent
      }
    })

  } catch (error) {
    console.error("Erro interno:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}