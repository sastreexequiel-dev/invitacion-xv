import "server-only";
import { getServiceClient } from "@/lib/supabase/admin";
import type { PublicGuest } from "@/lib/types";

/**
 * Busca la invitación por código desde el servidor. Solo devuelve los
 * datos de ESE invitado (nunca de otros). Si la base no está configurada
 * o el código no existe, devuelve invalid: true.
 */
export async function loadGuest(raw: string | string[] | undefined): Promise<{ guest: PublicGuest | null; invalidCode: boolean }> {
  const code = (Array.isArray(raw) ? raw[0] : raw)?.trim().toUpperCase();
  if (!code) return { guest: null, invalidCode: false };
  if (!/^[A-Z0-9]{6,16}$/.test(code)) return { guest: null, invalidCode: true };

  const supabase = getServiceClient();
  if (!supabase) return { guest: null, invalidCode: true };

  const { data, error } = await supabase.rpc("rsvp_get", { p_code: code });
  if (error) {
    console.error("[invitacion] error leyendo invitado:", error.message);
    return { guest: null, invalidCode: true };
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { guest: null, invalidCode: true };

  return {
    invalidCode: false,
    guest: {
      code,
      name: row.name,
      maxCompanions: row.max_companions,
      status: row.status,
      companions: row.companions,
      comment: row.comment,
      respondedAt: row.responded_at,
    },
  };
}
