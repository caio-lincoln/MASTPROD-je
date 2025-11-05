import { updateSession } from '@/lib/supabase/middleware'
import { type NextRequest } from 'next/server'

// Middleware sempre executa em Edge Runtime; não exporte runtime dinâmico
export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  // Matcher estático compatível com Next.js
  matcher: [
    '/((?!_next/.*|_vercel/.*|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)',
  ],
}
