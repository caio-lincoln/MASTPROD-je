import { NextRequest, NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    const { evento_id, empresa_id } = await request.json()

    if (!evento_id || !empresa_id) {
      return NextResponse.json(
        { error: "evento_id e empresa_id são obrigatórios" },
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

    // Log de auditoria
    await supabase.from("logs_auditoria").insert({
      empresa_id,
      usuario_id: null, // TODO: Implementar autenticação
      acao: "duplicar_evento_esocial",
      tabela: "eventos_esocial",
      registro_id: novoEvento.id,
      detalhes: {
        evento_original_id: evento_id,
        tipo_evento: eventoOriginal.tipo_evento,
        novo_evento_id: novoEvento.id
      }
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