// Configuração do Supabase para produção no Vercel
// Estas credenciais são públicas e seguras para uso no frontend

export const SUPABASE_CONFIG = {
  url: "https://your-project-ref.supabase.co",
  anonKey: "your-anon-key-here",
  serviceRoleKey: "your-service-role-key-here" // Apenas para uso server-side
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
    SUPABASE_CONFIG.url !== "https://your-project-ref.supabase.co" &&
    SUPABASE_CONFIG.anonKey !== "your-anon-key-here" &&
    SUPABASE_CONFIG.serviceRoleKey !== "your-service-role-key-here"
  )
}

// Configuração de ambiente
export const IS_PRODUCTION = process.env.NODE_ENV === "production"
export const IS_DEVELOPMENT = process.env.NODE_ENV === "development"