export function readCsrfCookie(): string | null {
  if (typeof document === "undefined") return null
  const match = document.cookie.match(/(?:^|; )csrf_token=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

export async function getCsrfTokenClient(): Promise<string> {
  const existing = readCsrfCookie()
  if (existing) return existing
  const resp = await fetch("/api/csrf", { method: "GET", credentials: "include" })
  if (!resp.ok) throw new Error("Falha ao obter CSRF token")
  const data = await resp.json()
  return data.csrfToken
}

function isApiUrl(url: string): boolean {
  if (url.startsWith("/api/")) return true
  try {
    const u = new URL(url)
    if (typeof window !== "undefined" && u.origin === window.location.origin) {
      return u.pathname.startsWith("/api/")
    }
    return false
  } catch {
    return false
  }
}

export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const url = typeof input === "string" ? input : (input as URL).toString()
  const method = (init.method || "GET").toUpperCase()
  const headers = new Headers(init.headers || {})
  const credentials: RequestCredentials = init.credentials || "include"

  if (isApiUrl(url) && ["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    const token = await getCsrfTokenClient()
    headers.set("x-csrf-token", token)
    // Garantir que JSON tenha Content-Type quando body é objeto
    if (!headers.has("Content-Type") && init.body && typeof init.body !== "string") {
      headers.set("Content-Type", "application/json")
    }
  }

  return fetch(input as any, { ...init, headers, credentials })
}

