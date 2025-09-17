import { createBrowserClient } from "@supabase/ssr"
import { getSupabaseUrl, getSupabaseAnonKey } from "@/lib/config/supabase-config"

export function createClient() {
  return createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey())
}

export { createClient as createBrowserClient }

// Create and export a default supabase instance
export const supabase = createClient()
