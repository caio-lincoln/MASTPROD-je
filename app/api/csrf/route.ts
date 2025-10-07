import { NextRequest, NextResponse } from "next/server"
import { getOrSetCsrfToken } from "@/lib/security/csrf"

export async function GET(req: NextRequest) {
  const res = NextResponse.json({ ok: true })
  const token = getOrSetCsrfToken(req, res)
  return NextResponse.json({ csrfToken: token }, {
    headers: res.headers,
  })
}