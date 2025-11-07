import { NextRequest, NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { isUuid } from "@/lib/security/validation"

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const { data: authData, error: authError } = await supabase.auth.getUser()

    if (authError || !authData?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    }
    
    const { evento_id, empresa_id } = await request.json()

    if (!evento_id || !empresa_id) {
      return NextResponse.json(
        { error: "evento_id e empresa_id são obrigatórios" },
        { status: 400 }
      )
    }

    if (!isUuid(evento_id) || !isUuid(empresa_id)) {
      return NextResponse.json(
        { error: "Parâmetros inválidos" },
        { status: 400 }
      )
    }

    // Buscar o evento original
    const { data: eventoOriginal, error: fetchError } = await supabase
      .from("eventos_esocial")
      .select("*")
      .eq("id", evento_id)
      .single()

    if (fetchError) {
      console.error("Erro ao buscar evento original:", fetchError)
      return NextResponse.json(
        { error: "Erro ao buscar evento original" },
        { status: 500 }
      )
    }

    if (!eventoOriginal) {
      return NextResponse.json(
        { error: "Evento não encontrado" },
        { status: 404 }
      )
    }

    // Criar dados do novo evento (duplicado)
    const novoEventoData = {
      tipo_evento: eventoOriginal.tipo_evento,
      entidade_id: empresa_id, // Usar empresa_id como entidade_id
      funcionario_id: eventoOriginal.funcionario_id,
      empresa_id: empresa_id,
      status: "preparando",
      xml_original: eventoOriginal.xml_original,
      xml_gerado: null,
      xml_assinado: null,
      data_evento: eventoOriginal.data_evento,
      lote_id: null,
      numero_recibo: null,
      data_processamento: null,
      mensagem_retorno: null,
      erros: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Inserir o novo evento
    const { data: novoEvento, error: insertError } = await supabase
      .from("eventos_esocial")
      .insert(novoEventoData)
      .select()
      .single()

    if (insertError) {
      console.error("Erro ao duplicar evento:", insertError)
      return NextResponse.json(
        { error: "Erro ao duplicar evento" },
        { status: 500 }
      )
    }

    // Se o evento original tinha XML no storage, duplicar também
    if (eventoOriginal.xml_url && eventoOriginal.xml_original) {
      try {
        const novoFileName = `${eventoOriginal.tipo_evento}_${novoEvento.id}_${Date.now()}.xml`
        
        // Upload do XML para o storage
        const { error: uploadError } = await supabase.storage
          .from("esocial")
          .upload(`${empresa_id}/${novoFileName}`, eventoOriginal.xml_original, {
            contentType: "application/xml"
          })

        if (!uploadError) {
          // Atualizar o evento com a URL do arquivo
          await supabase
            .from("eventos_esocial")
            .update({ xml_url: `${empresa_id}/${novoFileName}` })
            .eq("id", novoEvento.id)
        }
      } catch (storageError) {
        console.error("Erro ao duplicar XML no storage:", storageError)
        // Não falha a duplicação se não conseguir salvar no storage
      }
    }

    // Log de auditoria padronizado
    await supabase.from("logs_auditoria").insert({
      user_id: authData.user.id,
      empresa_id,
      acao: "duplicar_evento_esocial",
      entidade: "eventos_esocial",
      entidade_id: novoEvento.id,
      descricao: "Duplicação de evento do eSocial",
      dados_anteriores: {
        evento_original_id: evento_id,
        tipo_evento: eventoOriginal.tipo_evento,
      },
      dados_novos: {
        novo_evento_id: novoEvento.id,
        status: novoEvento.status,
      },
      created_at: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      evento: novoEvento,
      message: "Evento duplicado com sucesso"
    })

  } catch (error) {
    console.error("Erro interno:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
