import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { event } from "@/config/event";
import { getServiceClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const schema = z.object({
  code: z.string().trim().regex(/^[A-Za-z0-9]{6,16}$/).optional().or(z.literal("")),
  name: z.string().trim().min(2, "Ingresá tu nombre y apellido").max(120),
  attending: z.boolean(),
  companions: z.number().int().min(0).max(20),
  comment: z.string().trim().max(500).optional().default(""),
  website: z.string().optional(), // honeypot: los humanos no lo ven
});

const ERRORS: Record<string, { status: number; message: string }> = {
  INVALID_CODE: { status: 404, message: "No encontramos esta invitación. Revisá el enlace que recibiste." },
  INVALID_NAME: { status: 400, message: "Ingresá tu nombre y apellido." },
  INVALID_ATTENDING: { status: 400, message: "Indicá si vas a asistir." },
  INVALID_COMPANIONS: { status: 400, message: "La cantidad de acompañantes supera los lugares asignados." },
  INVALID_COMMENT: { status: 400, message: "El comentario es demasiado largo (máx. 500 caracteres)." },
  DUPLICATE_NAME: {
    status: 409,
    message:
      "Ya hay una confirmación registrada con ese nombre. Si sos vos, usá tu enlace personal para modificarla o comunicate con la familia.",
  },
};

function siteOrigin(req: NextRequest) {
  return (process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin).replace(/\/$/, "");
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!rateLimit(`rsvp:${ip}`)) {
    return NextResponse.json({ ok: false, error: "Demasiados intentos. Probá de nuevo en unos minutos." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Solicitud inválida." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json({ ok: false, error: first?.message || "Revisá los datos ingresados." }, { status: 400 });
  }
  const data = parsed.data;

  // Honeypot completado → bot. Respondemos OK sin guardar nada.
  if (data.website) return NextResponse.json({ ok: true, guest: null });

  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "La base de datos todavía no está configurada (faltan variables de entorno de Supabase)." },
      { status: 503 },
    );
  }

  const companions = data.attending ? data.companions : 0;
  let result;

  if (data.code) {
    result = await supabase.rpc("rsvp_submit_by_code", {
      p_code: data.code,
      p_name: data.name,
      p_attending: data.attending,
      p_companions: companions,
      p_comment: data.comment,
    });
  } else {
    if (!event.rsvp.allowOpenRsvp) {
      return NextResponse.json(
        { ok: false, error: "Para confirmar necesitás el enlace personal que te enviaron." },
        { status: 403 },
      );
    }
    result = await supabase.rpc("rsvp_submit_open", {
      p_name: data.name,
      p_attending: data.attending,
      p_companions: companions,
      p_comment: data.comment,
      p_max_companions: event.rsvp.openRsvpMaxCompanions,
    });
  }

  if (result.error) {
    const key = Object.keys(ERRORS).find((k) => result.error!.message.includes(k));
    if (key) return NextResponse.json({ ok: false, error: ERRORS[key].message }, { status: ERRORS[key].status });
    console.error("[rsvp] error de base de datos:", result.error.message);
    return NextResponse.json({ ok: false, error: "No pudimos guardar tu respuesta. Intentá nuevamente." }, { status: 500 });
  }

  const row = Array.isArray(result.data) ? result.data[0] : result.data;
  if (!row) {
    return NextResponse.json({ ok: false, error: "No pudimos guardar tu respuesta. Intentá nuevamente." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    guest: {
      code: row.code,
      name: row.name,
      status: row.status,
      companions: row.companions,
      maxCompanions: row.max_companions,
      respondedAt: row.responded_at,
    },
    editUrl: `${siteOrigin(req)}/invitacion?invitado=${row.code}`,
  });
}
