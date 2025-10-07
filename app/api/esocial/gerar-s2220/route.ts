import { NextRequest, NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { EsocialEventManager } from "@/lib/esocial/event-manager"
import { EsocialXmlBuilder } from "@/lib/esocial/xml-builder"
import { isUuid } from "@/lib/security/validation"

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { empresa_id, exame_id } = await request.json()

    if (!empresa_id || !exame_id) {
      return NextResponse.json(
        { error: "empresa_id e exame_id são obrigatórios" },
        { status: 400 }
      )
    }

    if (!isUuid(empresa_id) || !isUuid(exame_id)) {
      return NextResponse.json(
        { error: "Parâmetros inválidos" },
        { status: 400 }
      )
    }

    // Buscar dados do exame
    const { data: exame, error: exameError } = await supabase
      .from("exames_aso")
      .select(`
        *,
        funcionarios (
          *,
          empresas (*)
        )
      `)
      .eq("id", exame_id)
      .eq("empresa_id", empresa_id)
      .single()

    if (exameError || !exame) {
      return NextResponse.json(
        { error: "Exame não encontrado" },
        { status: 404 }
      )
    }

    // Verificar se já existe evento para este exame
    const { data: eventoExistente } = await supabase
      .from("eventos_esocial")
      .select("id")
      .eq("exame_id", exame_id)
      .eq("tipo_evento", "S-2220")
      .single()

    if (eventoExistente) {
      return NextResponse.json(
        { error: "Já existe um evento S-2220 para este exame" },
        { status: 400 }
      )
    }

    // Gerar XML do evento
    const xmlBuilder = new EsocialXmlBuilder()
    const xmlContent = await xmlBuilder.gerarS2220(exame)

    // Criar evento no banco
    const eventManager = new EsocialEventManager()
    const evento = await eventManager.criarEvento({
      tipo_evento: "S-2220",
      empresa_id,
      funcionario_id: exame.funcionario_id,
      exame_id,
      xml_content: xmlContent,
      status: "preparando",
      dados_evento: {
        tipo_exame: exame.tipo_exame,
        data_exame: exame.data_exame,
        resultado: exame.resultado,
        medico_responsavel: exame.medico_responsavel,
        crm: exame.crm,
      }
    })

    return NextResponse.json({
      success: true,
      evento_id: evento.id,
      message: "Evento S-2220 gerado com sucesso"
    })

  } catch (error) {
    console.error("Erro ao gerar evento S-2220:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}