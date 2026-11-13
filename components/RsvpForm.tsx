"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { event } from "@/config/event";
import type { PublicGuest, RsvpStatus } from "@/lib/types";
import { formatDeadline } from "@/lib/format";

type Result = { name: string; status: RsvpStatus; companions: number; code: string; editUrl: string };

const ease = [0.22, 1, 0.36, 1] as const;

export default function RsvpForm({ guest, invalidCode }: { guest: PublicGuest | null; invalidCode: boolean }) {
  const maxCompanions = guest ? guest.maxCompanions : event.rsvp.openRsvpMaxCompanions;
  const alreadyAnswered = guest && guest.status !== "pending";

  const [editing, setEditing] = useState(!alreadyAnswered);
  const [name, setName] = useState(guest?.name ?? "");
  const [attending, setAttending] = useState<boolean | null>(
    guest && guest.status !== "pending" ? guest.status === "confirmed" : null,
  );
  const [companions, setCompanions] = useState(guest?.companions ?? 0);
  const [comment, setComment] = useState(guest?.comment ?? "");
  const [website, setWebsite] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [copied, setCopied] = useState(false);

  const canOpen = Boolean(guest) || event.rsvp.allowOpenRsvp;

  if (invalidCode) {
    return (
      <Notice title="Enlace no válido">
        No encontramos esta invitación. Revisá que el enlace esté completo o pedile uno nuevo a la familia.
      </Notice>
    );
  }
  if (!canOpen) {
    return <Notice title="Confirmación personal">Para confirmar usá el enlace personal que recibiste por WhatsApp.</Notice>;
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (name.trim().length < 2) return setError("Ingresá tu nombre y apellido.");
    if (attending === null) return setError("Contanos si vas a poder asistir.");
    setSending(true);
    try {
      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: guest?.code ?? "",
          name,
          attending,
          companions: attending ? companions : 0,
          comment,
          website,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "No pudimos guardar tu respuesta. Intentá nuevamente.");
      if (json.guest) {
        setResult({ ...json.guest, editUrl: json.editUrl });
        setEditing(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de conexión. Revisá tu internet e intentá otra vez.");
    } finally {
      setSending(false);
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* algunos navegadores integrados no permiten copiar */ }
  };

  // ── Pantalla de agradecimiento ───────────────────────────────
  if (result) {
    const yes = result.status === "confirmed";
    return (
      <motion.div
        className="glass relative mx-auto max-w-lg overflow-hidden rounded-[2rem] px-7 py-12 text-center"
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.9, ease }}
      >
        <Burst />
        <motion.div
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-champagne/60"
          initial={{ scale: 0, rotate: -90 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.2, duration: 0.8, ease }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f3dca6" strokeWidth="1.5" aria-hidden>
            {yes ? <path d="M5 12.5l4.5 4.5L19 7.5" /> : <path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.5-7 10-7 10z" />}
          </svg>
        </motion.div>
        <p className="mt-6 font-script text-5xl text-gold sm:text-6xl">{yes ? "¡Gracias!" : "Te vamos a extrañar"}</p>
        <p className="mt-4 font-serif text-xl text-pearl/90">
          {yes
            ? `${result.name.split(" ")[0]}, tu asistencia quedó confirmada${result.companions ? ` junto a ${result.companions} acompañante${result.companions > 1 ? "s" : ""}` : ""}.`
            : `${result.name.split(" ")[0]}, gracias por avisarnos. Vas a estar en mis pensamientos esa noche.`}
        </p>
        {yes && <p className="mt-2 font-serif text-lg italic text-champagne-light/80">¡Te espero para brillar juntos!</p>}

        <div className="mt-8 rounded-2xl border border-white/10 bg-black/20 p-4 text-left">
          <p className="font-sans text-[0.7rem] uppercase tracking-[0.2em] text-silver-dim">Tu enlace personal</p>
          <p className="mt-1 font-sans text-sm text-pearl/70">Guardalo para modificar tu respuesta cuando quieras.</p>
          <div className="mt-3 flex gap-2">
            <input readOnly value={result.editUrl} className="field !py-3 text-xs" onFocus={(e) => e.currentTarget.select()} />
            <button type="button" onClick={() => copy(result.editUrl)} className="btn-ghost !min-h-[46px] shrink-0 !px-4 !text-[0.62rem]">
              {copied ? "Copiado" : "Copiar"}
            </button>
          </div>
        </div>
        <button type="button" onClick={() => { setResult(null); setEditing(true); }} className="mt-6 font-sans text-xs uppercase tracking-[0.25em] text-champagne underline-offset-4 hover:underline">
          Modificar respuesta
        </button>
      </motion.div>
    );
  }

  // ── Ya respondió antes (entrando con su enlace) ─────────────
  if (!editing && guest && alreadyAnswered) {
    return (
      <div className="glass mx-auto max-w-lg rounded-[2rem] px-7 py-10 text-center">
        <p className="eyebrow">Hola, {guest.name.split(" ")[0]}</p>
        <p className="mt-4 font-serif text-2xl text-pearl">
          {guest.status === "confirmed"
            ? `Ya confirmaste tu asistencia${guest.companions ? ` con ${guest.companions} acompañante${guest.companions > 1 ? "s" : ""}` : ""}.`
            : "Nos avisaste que no vas a poder venir."}
        </p>
        <p className="mt-2 font-sans text-sm text-silver-dim">¿Cambió algo? Podés actualizar tu respuesta.</p>
        <button type="button" onClick={() => setEditing(true)} className="btn-ghost mt-7">Modificar respuesta</button>
      </div>
    );
  }

  // ── Formulario ───────────────────────────────────────────────
  return (
    <form onSubmit={submit} noValidate className="glass relative mx-auto max-w-lg rounded-[2rem] px-6 py-9 sm:px-9">
      {guest ? (
        <p className="text-center font-serif text-xl text-pearl/90">
          Hola, <span className="text-gold">{guest.name.split(" ")[0]}</span>.
          {guest.maxCompanions > 0 && (
            <span className="mt-1 block font-sans text-sm text-silver-dim">
              Reservamos {guest.maxCompanions + 1} lugares para vos: tu lugar + {guest.maxCompanions} acompañante{guest.maxCompanions > 1 ? "s" : ""}.
            </span>
          )}
        </p>
      ) : null}

      <p className="mt-2 text-center font-sans text-sm text-silver-dim">Por favor confirmá antes del {formatDeadline()}.</p>

      <div className="mt-8 space-y-6">
        <label className="block">
          <span className="mb-2 block font-sans text-[0.7rem] uppercase tracking-[0.22em] text-champagne/90">Nombre y apellido</span>
          <input
            className="field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            maxLength={120}
            placeholder="Tu nombre completo"
            required
          />
        </label>

        <fieldset>
          <legend className="mb-2 block font-sans text-[0.7rem] uppercase tracking-[0.22em] text-champagne/90">¿Vas a asistir?</legend>
          <div className="grid grid-cols-2 gap-3">
            {[
              { v: true, label: "Sí, voy", sub: "¡Ahí estaré!" },
              { v: false, label: "No puedo", sub: "Lo lamento" },
            ].map((o) => {
              const active = attending === o.v;
              return (
                <button
                  key={String(o.v)}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setAttending(o.v)}
                  className={`relative min-h-[76px] rounded-2xl border px-4 py-3 text-center transition-all duration-300 ${
                    active
                      ? "border-champagne bg-champagne/15 shadow-[0_0_30px_-8px_rgba(217,188,132,.6)]"
                      : "border-white/10 bg-white/[0.03] hover:border-champagne/40"
                  }`}
                >
                  <span className={`block font-serif text-xl ${active ? "text-champagne-light" : "text-pearl/85"}`}>{o.label}</span>
                  <span className="block font-sans text-[0.68rem] uppercase tracking-[0.18em] text-silver-dim">{o.sub}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <AnimatePresence initial={false}>
          {attending && maxCompanions > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.45, ease }}
              className="overflow-hidden"
            >
              <span className="mb-2 block font-sans text-[0.7rem] uppercase tracking-[0.22em] text-champagne/90">
                Acompañantes <span className="normal-case tracking-normal text-silver-dim">(máximo {maxCompanions})</span>
              </span>
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-2">
                <Stepper label="Quitar acompañante" disabled={companions <= 0} onClick={() => setCompanions((c) => Math.max(0, c - 1))}>−</Stepper>
                <div className="text-center">
                  <span className="text-gold font-serif text-4xl tabular-nums">{companions}</span>
                  <span className="block font-sans text-[0.65rem] uppercase tracking-[0.2em] text-silver-dim">
                    Total: {companions + 1} persona{companions ? "s" : ""}
                  </span>
                </div>
                <Stepper label="Agregar acompañante" disabled={companions >= maxCompanions} onClick={() => setCompanions((c) => Math.min(maxCompanions, c + 1))}>+</Stepper>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <label className="block">
          <span className="mb-2 block font-sans text-[0.7rem] uppercase tracking-[0.22em] text-champagne/90">
            Comentarios <span className="normal-case tracking-normal text-silver-dim">(opcional)</span>
          </span>
          <textarea
            className="field min-h-[96px] resize-none"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={500}
            placeholder="Restricciones alimentarias, un mensaje para la quinceañera…"
          />
        </label>

        {/* Honeypot anti-bots: oculto para personas */}
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          className="absolute -left-[9999px] h-0 w-0 opacity-0"
          aria-hidden
        />
      </div>

      <AnimatePresence>
        {error && (
          <motion.p
            role="alert"
            className="mt-6 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-center font-sans text-sm text-red-200"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      <button type="submit" disabled={sending} className="btn-gold mt-8 w-full">
        <span className="relative z-10">{sending ? "Enviando…" : alreadyAnswered ? "Actualizar respuesta" : "Confirmar"}</span>
      </button>
    </form>
  );
}

function Stepper({ children, onClick, disabled, label }: { children: React.ReactNode; onClick: () => void; disabled: boolean; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex h-14 w-14 items-center justify-center rounded-xl border border-champagne/40 font-serif text-3xl text-champagne-light transition active:scale-90 disabled:opacity-25"
    >
      {children}
    </button>
  );
}

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass mx-auto max-w-lg rounded-[2rem] px-7 py-10 text-center">
      <p className="eyebrow">{title}</p>
      <p className="mt-4 font-serif text-xl text-pearl/85">{children}</p>
    </div>
  );
}

/** Destellos dorados al confirmar */
function Burst() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      {Array.from({ length: 18 }).map((_, i) => {
        const angle = (i / 18) * Math.PI * 2;
        const dist = 120 + (i % 3) * 40;
        return (
          <motion.span
            key={i}
            className="absolute left-1/2 top-[22%] h-1.5 w-1.5 rounded-full bg-champagne-light shadow-[0_0_10px_2px_rgba(243,220,166,.7)]"
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, opacity: 0, scale: 0.3 }}
            transition={{ duration: 1.6, ease: "easeOut", delay: 0.25 }}
          />
        );
      })}
    </div>
  );
}
