import { NextRequest, NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { isUuid } from "@/lib/security/validation"

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const { data: authData, error: authError } = await supabase.auth.getUser()

    if (authError || !authData?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    }
    const eventoId = params.id

    if (!eventoId) {
      return NextResponse.json(
        { error: "ID do evento é obrigatório" },
        { status: 400 }
      )
    }

    if (!isUuid(eventoId)) {
      return NextResponse.json(
        { error: "Parâmetro inválido" },
        { status: 400 }
      )
    }

    // Verificar se o evento existe
    const { data: evento, error: fetchError } = await supabase
      .from("eventos_esocial")
      .select("id, tipo_evento, status, xml_url, empresa_id")
      .eq("id", eventoId)
      .single()

    if (fetchError) {
      console.error("Erro ao buscar evento:", fetchError)
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

    // Verificar se o evento pode ser excluído (não pode estar enviado ou processado)
    if (evento.status === "enviado" || evento.status === "processado") {
      return NextResponse.json(
        { error: "Não é possível excluir eventos que já foram enviados ou processados" },
        { status: 400 }
      )
    }

    // Excluir arquivo XML do storage se existir
    if (evento.xml_url) {
      try {
        const { error: deleteFileError } = await supabase.storage
          .from("esocial")
          .remove([evento.xml_url])
        
        if (deleteFileError) {
          console.error("Erro ao excluir arquivo XML:", deleteFileError)
          // Não falha a exclusão se não conseguir excluir o arquivo
        }
      } catch (storageError) {
        console.error("Erro ao acessar storage:", storageError)
        // Não falha a exclusão se não conseguir acessar o storage
      }
    }

    // Excluir o evento do banco de dados
    const { error: deleteError } = await supabase
      .from("eventos_esocial")
      .delete()
      .eq("id", eventoId)

    if (deleteError) {
      console.error("Erro ao excluir evento:", deleteError)
      return NextResponse.json(
        { error: "Erro ao excluir evento" },
        { status: 500 }
      )
    }

    // Log de auditoria padronizado
    await supabase.from("logs_auditoria").insert({
      user_id: authData.user.id,
      empresa_id: evento.empresa_id,
      acao: "excluir_evento_esocial",
      entidade: "eventos_esocial",
      entidade_id: eventoId,
      descricao: "Exclusão de evento do eSocial",
      dados_anteriores: {
        tipo_evento: evento.tipo_evento,
        status_anterior: evento.status,
      },
      dados_novos: null,
      created_at: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      message: "Evento excluído com sucesso"
    })

  } catch (error) {
    console.error("Erro interno:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
