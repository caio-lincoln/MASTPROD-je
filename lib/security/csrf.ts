import { NextRequest, NextResponse } from "next/server"

const CSRF_COOKIE = "csrf_token"

function generateRandomToken(): string {
  const buf = new Uint8Array(32)
  crypto.getRandomValues(buf)
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

export function getOrSetCsrfToken(req: NextRequest, res: NextResponse): string {
  const existing = req.cookies.get(CSRF_COOKIE)?.value
  if (existing && existing.length > 0) return existing

  const token = generateRandomToken()
  // SameSite=Strict to protect against CSRF, not HttpOnly so client can read if needed
  res.cookies.set(CSRF_COOKIE, token, {
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24, // 1 day
  })
  return token
}

export function verifyCsrf(req: NextRequest): boolean {
  // Only verify for state-changing methods
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return true
  const cookieToken = req.cookies.get(CSRF_COOKIE)?.value || ""
  const headerToken = req.headers.get("x-csrf-token") || ""
  return cookieToken.length > 0 && headerToken.length > 0 && cookieToken === headerToken
}