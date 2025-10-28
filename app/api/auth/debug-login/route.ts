import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getSupabaseUrl, getSupabaseAnonKey } from "@/lib/config/supabase-config"

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: "Parâmetros inválidos", details: "Forneça 'email' e 'password'" },
        { status: 400 }
      )
    }

    const supabase = createClient(getSupabaseUrl(), getSupabaseAnonKey())

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: {
            name: (error as any).name ?? "AuthError",
            message: error.message,
            status: (error as any).status ?? null,
          },
        },
        { status: 200 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        user: {
          id: data.user?.id,
          email: data.user?.email,
        },
      },
      { status: 200 }
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro desconhecido"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}