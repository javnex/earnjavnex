import { createClient } from "@supabase/supabase-js";

export const DEFAULT_SUPABASE_URL = "https://uvvsxermsafrpurzoaxx.supabase.co";
export const DEFAULT_SUPABASE_ANON_KEY = "sb_publishable_5BB-BvMCjks_mkb-_DxNew_4_qwQawk";

export function getSupabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
}

export function getSupabaseAnonKey(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;
}

// Client for public / client-side Supabase interactions
export const supabase = createClient(
  getSupabaseUrl(),
  getSupabaseAnonKey()
);

// Server-side admin client using service_role key when available
export function getSupabaseAdmin() {
  const url = getSupabaseUrl();
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    getSupabaseAnonKey();

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
