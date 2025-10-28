import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
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

    const cookieStore = await cookies()
    const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // Server Component context; middleware can refresh session if needed
          }
        },
      },
    })

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      return NextResponse.json(
        { success: false, error: { message: error.message } },
        { status: 200 }
      )
    }

    return NextResponse.json(
      { success: true, user: { id: data.user?.id, email: data.user?.email } },
      { status: 200 }
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro desconhecido"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}