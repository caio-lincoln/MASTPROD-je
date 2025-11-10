import { NextRequest, NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { EsocialEventManager } from "@/lib/esocial/event-manager"
import { EsocialXmlBuilder } from "@/lib/esocial/xml-builder"
import { isUuid } from "@/lib/security/validation"
import type { DadosS1000 } from "@/lib/esocial/types"

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Verificar usuário autenticado
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { empresa_id, dados }: { empresa_id: string; dados: DadosS1000 } = await request.json()

    if (!empresa_id || !dados) {
      return NextResponse.json(
        { error: "empresa_id e dados (S-1000) são obrigatórios" },
        { status: 400 }
      )
    }

    if (!isUuid(empresa_id)) {
      return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 })
    }

    // Opcional: evitar duplicidade por período
    if (dados.idePeriodo?.iniValid) {
      const { data: existente } = await supabase
        .from("eventos_esocial")
        .select("id")
        .eq("empresa_id", empresa_id)
        .eq("tipo_evento", "S-1000")
        .contains("dados_evento", { idePeriodo: { iniValid: dados.idePeriodo.iniValid } } as any)
        .limit(1)
        .maybeSingle()

      if (existente) {
        return NextResponse.json(
          { error: "Já existe um evento S-1000 para o período informado" },
          { status: 400 }
        )
      }
    }

    // Gerar XML do S-1000 (ambiente de produção)
    const xmlBuilder = new EsocialXmlBuilder({ ambiente: "producao" })
    const xmlContent = await xmlBuilder.gerarS1000(empresa_id, dados)

    // Criar evento no banco
    const eventManager = new EsocialEventManager()
    const evento = await eventManager.criarEvento({
      tipo_evento: "S-1000",
      empresa_id,
      xml_content: xmlContent,
      status: "preparando",
      dados_evento: dados,
    })

    return NextResponse.json({
      success: true,
      evento_id: evento.id,
      message: "Evento S-1000 gerado com sucesso",
    })
  } catch (error) {
    console.error("Erro ao gerar evento S-1000:", error)
    return NextResponse.json(
      {
        error: "Erro interno do servidor",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    )
  }
}
