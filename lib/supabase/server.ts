import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "@/lib/env";

/** Cliente de servidor ligado a la sesión del usuario (cookies). */
export async function getSessionClient() {
  if (!isSupabaseConfigured) return null;
  const store = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          /* en Server Components no se pueden escribir cookies: lo hace proxy.ts */
        }
      },
    },
  });
}

/** Devuelve el usuario si está logueado Y figura en la tabla admins. */
export async function getAdminUser() {
  const supabase = await getSessionClient();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("admins").select("user_id").eq("user_id", user.id).maybeSingle();
  return data ? user : null;
}
