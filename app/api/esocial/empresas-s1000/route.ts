import { NextRequest, NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export async function GET(_req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Primeiro tenta obter usuário via cookies (sessão SSR)
    let {
      data: { user },
    } = await supabase.auth.getUser()

    // Fallback: tentar via Authorization: Bearer <token>
    if (!user?.id) {
      const authHeader = _req.headers.get("authorization") || _req.headers.get("Authorization")
      const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : undefined
      if (token) {
        const byToken = await supabase.auth.getUser(token)
        user = byToken.data.user
      }
    }

    if (!user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

  // Buscar eventos S-1000 e mapear para empresas distintas
  const { data: eventos, error: evErr } = await supabase
    .from("eventos_esocial")
    .select(
      `empresa_id,
       empresas:empresa_id ( id, nome, cnpj )`
    )
    .eq("tipo_evento", "S-1000")
    .eq("status", "processado")
    .order("created_at", { ascending: false })

    if (evErr) {
      return NextResponse.json({ error: evErr.message }, { status: 500 })
    }

    // Deduplicar empresas
    const mapa = new Map<string, { id: string; nome: string; cnpj: string }>()
    for (const e of eventos || []) {
      const emp = (e as any).empresas
      if (emp?.id && !mapa.has(emp.id)) {
        mapa.set(emp.id, { id: emp.id, nome: emp.nome, cnpj: emp.cnpj })
      }
    }

    const empresas = Array.from(mapa.values()).sort((a, b) => (a.nome || "").localeCompare(b.nome || ""))
    return NextResponse.json({ sucesso: true, empresas })
  } catch (error) {
    console.error("Erro ao listar empresas S-1000:", error)
    return NextResponse.json(
      { error: "Erro interno", detalhes: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
