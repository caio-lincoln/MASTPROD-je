// Configuração do Supabase para produção no Vercel
// Estas credenciais são públicas e seguras para uso no frontend

export const SUPABASE_CONFIG = {
  url: "https://ifvgnuhyfmadzkqmtfkl.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmdmdudWh5Zm1hZHprcW10ZmtsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3NDM5NzUsImV4cCI6MjA3MjMxOTk3NX0.VSEgEuBtDcgY3mXTAALQJPBHv6tLDkzzORuFwBPNSFw",
  serviceRoleKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmdmdudWh5Zm1hZHprcW10ZmtsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njc0Mzk3NSwiZXhwIjoyMDcyMzE5OTc1fQ.ljnRx4I8q_fKDrrzN1zm5w1frFBaMxYjgBzSKn6kmnQ" // Apenas para uso server-side
}

// Função para obter a URL do Supabase
export function getSupabaseUrl(): string {
  return SUPABASE_CONFIG.url
}

// Função para obter a chave anônima do Supabase
export function getSupabaseAnonKey(): string {
  return SUPABASE_CONFIG.anonKey
}

// Função para obter a chave de service role (apenas server-side)
export function getSupabaseServiceRoleKey(): string {
  return SUPABASE_CONFIG.serviceRoleKey
}

// Função para verificar se as configurações estão válidas
export function isSupabaseConfigured(): boolean {
  return (
    SUPABASE_CONFIG.url.length > 0 &&
    SUPABASE_CONFIG.anonKey.length > 0 &&
    SUPABASE_CONFIG.serviceRoleKey.length > 0
  )
}

// Configuração de ambiente
export const IS_PRODUCTION = process.env.NODE_ENV === "production"
export const IS_DEVELOPMENT = process.env.NODE_ENV === "development"