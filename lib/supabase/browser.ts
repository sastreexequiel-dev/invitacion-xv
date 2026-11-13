"use client";
import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";

/** Cliente para el panel (sesión del administrador + RLS). */
export function getBrowserClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
