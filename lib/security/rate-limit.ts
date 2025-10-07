import { NextRequest, NextResponse } from "next/server"

// Naive cookie-based rate limit. For production-grade, use Redis/KV (e.g., Upstash).
// This is a basic, easy-to-integrate limiter suitable for small apps.

type RateCookie = {
  ts: number // window start timestamp (ms)
  c: number // count in window
}

const RL_COOKIE = "rl_basic"

export interface RateLimitOptions {
  windowMs: number
  max: number
}

export function checkRateLimit(
  req: NextRequest,
  res: NextResponse,
  options: RateLimitOptions,
): { allowed: boolean; retryAfter: number } {
  // Per-path basic limiting; can be adjusted to per-IP using headers
  const key = `${RL_COOKIE}:${req.nextUrl.pathname}`
  const raw = req.cookies.get(key)?.value
  const now = Date.now()
  const windowMs = options.windowMs
  const max = options.max

  let data: RateCookie | null = null
  if (raw) {
    try {
      data = JSON.parse(raw)
    } catch {
      data = null
    }
  }

  if (!data || now - data.ts >= windowMs) {
    data = { ts: now, c: 1 }
  } else {
    data.c += 1
  }

  const allowed = data.c <= max
  const retryAfter = allowed ? 0 : data.ts + windowMs - now

  res.cookies.set(key, JSON.stringify(data), {
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: Math.ceil(windowMs / 1000),
  })

  return { allowed, retryAfter }
}