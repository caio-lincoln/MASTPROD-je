import { createClient } from "@/lib/supabase/client"

export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers || {})
  const credentials: RequestCredentials = init.credentials || "include"

  // Definir Content-Type automaticamente para payloads não string
  if (!headers.has("Content-Type") && init.body && typeof init.body !== "string") {
    headers.set("Content-Type", "application/json")
  }

  // Anexar Authorization: Bearer <token> se houver sessão do Supabase
  try {
    const supabase = createClient()
    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData?.session?.access_token
    if (accessToken && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${accessToken}`)
    }
  } catch (_) {
    // silencioso: se falhar ao obter sessão, seguir sem Authorization
  }

  return fetch(input as any, { ...init, headers, credentials })
}
