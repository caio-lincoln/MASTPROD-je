import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { getSupabaseUrl, getSupabaseAnonKey } from "@/lib/config/supabase-config"
import { getSecurityHeaders } from "@/lib/security/headers"
import { getOrSetCsrfToken, verifyCsrf } from "@/lib/security/csrf"
import { checkRateLimit } from "@/lib/security/rate-limit"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  const securityHeaders = getSecurityHeaders()
  // Initialize CSRF token cookie if missing
  const csrfToken = getOrSetCsrfToken(request, supabaseResponse)

  const isProd = process.env.NODE_ENV === "production"
  const isInternalJob = request.headers.get("x-internal-job") === "true"

  const supabaseUrl = getSupabaseUrl()
  const supabaseAnonKey = getSupabaseAnonKey()

  if (
    request.nextUrl.pathname.startsWith("/auth/register") ||
    request.nextUrl.pathname.startsWith("/auth/sign-up") ||
    request.nextUrl.pathname.startsWith("/signup") ||
    request.nextUrl.pathname.startsWith("/register")
  ) {
    const url = request.nextUrl.clone()
    url.pathname = "/auth/login"
    const resp = NextResponse.redirect(url)
    if (isProd) {
      Object.entries(securityHeaders).forEach(([k, v]) => resp.headers.set(k, v))
    }
    return resp
  }

  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
      },
    },
  })

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: If you remove getUser() and you use server-side rendering
  // with the Supabase client, your users may be randomly logged out.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const isAuthRelated =
    path.startsWith("/login") ||
    path.startsWith("/auth") ||
    path.startsWith("/api/auth") ||
    path.startsWith("/api/csrf") ||
    path.startsWith("/api/health")

  if (
    path !== "/" &&
    !user &&
    !isInternalJob &&
    !isAuthRelated
  ) {
    // no user, potentially respond by redirecting the user to the login page
    const url = request.nextUrl.clone()
    url.pathname = "/auth/login"
    const resp = NextResponse.redirect(url)
    if (isProd) {
      Object.entries(securityHeaders).forEach(([k, v]) => resp.headers.set(k, v))
    }
    return resp
  }

  // Basic rate limiting for API write operations (only enabled in production)
  if (
    isProd &&
    !isInternalJob &&
    ["POST", "PUT", "PATCH", "DELETE"].includes(request.method) &&
    request.nextUrl.pathname.startsWith("/api/")
  ) {
    const { allowed, retryAfter } = checkRateLimit(request, supabaseResponse, { windowMs: 60_000, max: 60 })
    if (!allowed) {
      // Log suspicious attempt for authenticated users
      try {
        if (user) {
          await supabase.rpc("log_acao", {
            acao_input: "bloqueio_rate_limit",
            entidade_input: "seguranca",
            entidade_id_input: null,
            descricao_input: `Rate limit excedido em ${request.nextUrl.pathname}`,
            dados_anteriores_input: null,
            dados_novos_input: null,
            ip_address_input: (request.headers.get("x-forwarded-for") || "") as any,
            user_agent_input: request.headers.get("user-agent") || "",
          })
        }
      } catch {
        // ignore logging failures
      }
      const blocked = new NextResponse(JSON.stringify({ error: "Too Many Requests" }), { status: 429 })
      blocked.headers.set("Retry-After", Math.ceil(retryAfter / 1000).toString())
      if (isProd) {
        Object.entries(securityHeaders).forEach(([k, v]) => blocked.headers.set(k, v))
      }
      return blocked
    }
  }

  // CSRF verification for state-changing API requests (only enabled in production)
  if (
    isProd &&
    !isInternalJob &&
    ["POST", "PUT", "PATCH", "DELETE"].includes(request.method) &&
    request.nextUrl.pathname.startsWith("/api/")
  ) {
    const validCsrf = verifyCsrf(request)
    if (!validCsrf) {
      // Log suspicious attempt for authenticated users
      try {
        if (user) {
          await supabase.rpc("log_acao", {
            acao_input: "bloqueio_csrf",
            entidade_input: "seguranca",
            entidade_id_input: null,
            descricao_input: `CSRF inválido em ${request.nextUrl.pathname}`,
            dados_anteriores_input: null,
            dados_novos_input: null,
            ip_address_input: (request.headers.get("x-forwarded-for") || "") as any,
            user_agent_input: request.headers.get("user-agent") || "",
          })
        }
      } catch {
        // ignore logging failures
      }
      const blocked = new NextResponse(JSON.stringify({ error: "CSRF token inválido" }), { status: 403 })
      if (isProd) {
        Object.entries(securityHeaders).forEach(([k, v]) => blocked.headers.set(k, v))
      }
      return blocked
    }
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  if (isProd) {
    Object.entries(securityHeaders).forEach(([k, v]) => supabaseResponse.headers.set(k, v))
  }
  // Expose CSRF token to clients (for fetching via /api/csrf) without leaking value here
  return supabaseResponse
}
