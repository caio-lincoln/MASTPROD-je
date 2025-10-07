import { getSupabaseUrl } from "@/lib/config/supabase-config"

function getHostFromUrl(url: string): string | null {
  try {
    const u = new URL(url)
    return u.host
  } catch {
    return null
  }
}

export function getSecurityHeaders(): Record<string, string> {
  const supabaseUrl = getSupabaseUrl()
  const supabaseHost = getHostFromUrl(supabaseUrl) || ""
  const isDev = process.env.NODE_ENV !== "production"

  const scriptSrc = ["'self'", "'wasm-unsafe-eval'", "'inline-speculation-rules'", ...(isDev ? ["'unsafe-eval'"] : [])]
  const connectSrc = [
    "'self'",
    `https://${supabaseHost}`,
    `wss://${supabaseHost}`,
    ...(isDev ? ["ws:"] : []),
  ]

  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    `script-src ${scriptSrc.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src ${connectSrc.join(" ")}`,
    isDev ? "frame-ancestors *" : "frame-ancestors 'none'",
    "form-action 'self'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ")

  const headers: Record<string, string> = {
    "Content-Security-Policy": csp,
    // Em dev, não bloquear embed/preview
    ...(isDev ? {} : { "X-Frame-Options": "DENY" }),
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
    "Cross-Origin-Opener-Policy": isDev ? "unsafe-none" : "same-origin",
    "Cross-Origin-Resource-Policy": isDev ? "cross-origin" : "same-origin",
    "Permissions-Policy": [
      "accelerometer=()",
      "camera=()",
      "geolocation=()",
      "microphone=()",
      "payment=()",
      "usb=()",
    ].join(", "),
  }

  return headers
}