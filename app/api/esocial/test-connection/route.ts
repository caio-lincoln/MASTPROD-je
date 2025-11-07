import { NextRequest, NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { EsocialService } from "@/lib/esocial/esocial-service"
import { isUuid } from "@/lib/security/validation"

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const { data: authData, error: authError } = await supabase.auth.getUser()

    if (authError || !authData?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    }

    const { empresa_id } = await request.json()

    if (!empresa_id || !isUuid(empresa_id)) {
      return NextResponse.json({ error: "empresa_id inválido" }, { status: 400 })
    }

    const service = new EsocialService()
    const resultado = await service.testarConectividade(empresa_id)

    // Log de auditoria
    await supabase.from("logs_auditoria").insert({
      empresa_id,
      usuario_id: authData.user.id,
      acao: "testar_conexao_esocial",
      tabela: "esocial",
      registro_id: empresa_id,
      detalhes: {
        conectado: resultado.conectado,
        ambiente: resultado.ambiente,
        erro: resultado.erro,
      },
    })

    return NextResponse.json({
      success: resultado.conectado,
      ambiente: resultado.ambiente,
      erro: resultado.erro,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro interno do servidor" },
      { status: 500 },
    )
  }
}

