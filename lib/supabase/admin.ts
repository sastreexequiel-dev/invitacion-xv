import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/env";

/**
 * Cliente con service_role. SOLO se usa en el servidor (rutas /api y
 * componentes de servidor). El import "server-only" hace fallar el build
 * si alguien intenta importarlo desde el navegador.
 */
let cached: SupabaseClient | null = null;

export function getServiceClient(): SupabaseClient | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !key) return null;
  if (!cached) {
    cached = createClient(SUPABASE_URL, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}
