import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const empresa_id = searchParams.get("empresa_id")
    if (!empresa_id) {
      return NextResponse.json({ error: "empresa_id é obrigatório" }, { status: 400 })
    }
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("configuracoes_email")
      .select("servidor, porta, usuario, ssl, remetente, from_nome, ativo, updated_at")
      .eq("empresa_id", empresa_id)
      .maybeSingle()
    if (error) throw error
    if (!data) return NextResponse.json({ data: null })
    return NextResponse.json({
      data: {
        ...data,
        hasSenha: true, // Não retornamos a senha por segurança
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Erro ao obter configuração" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const required = ["empresa_id", "servidor", "porta", "usuario", "senha", "ssl", "remetente"]
    for (const key of required) {
      if (!(key in body)) {
        return NextResponse.json({ error: `Campo obrigatório ausente: ${key}` }, { status: 400 })
      }
    }

    const supabase = await createClient()
    const payload = {
      empresa_id: body.empresa_id,
      servidor: String(body.servidor),
      porta: Number(body.porta) || 587,
      usuario: String(body.usuario),
      senha: String(body.senha),
      ssl: Boolean(body.ssl),
      remetente: String(body.remetente),
      from_nome: body.from_nome ? String(body.from_nome) : null,
      ativo: body.ativo !== undefined ? Boolean(body.ativo) : true,
    }

    const { error } = await supabase
      .from("configuracoes_email")
      .upsert(payload, { onConflict: "empresa_id" })

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Erro ao salvar configuração" }, { status: 500 })
  }
}

