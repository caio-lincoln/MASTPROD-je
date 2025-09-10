import { createBrowserClient } from "@supabase/ssr"
import { getSupabaseUrl, getSupabaseAnonKey } from "@/lib/config/supabase-config"

export function createClient() {
  return createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey())
}

export { createClient as createBrowserClient }
