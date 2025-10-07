import { updateSession } from '@/lib/supabase/middleware'
import { type NextRequest } from 'next/server'

// Configurar runtime para edge (otimizado para Vercel)
export const runtime = process.env.NODE_ENV === 'production' ? 'experimental-edge' : 'nodejs'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Evita interceptar rotas internas do Next.js e arquivos estáticos,
     * incluindo HMR (/_next/webpack-hmr) e dados (/_next/data).
     */
    '/((?!_next/.*|_vercel/.*|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)',
  ],
}
