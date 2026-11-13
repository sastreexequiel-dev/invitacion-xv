"use client";
import { useState } from "react";
import type { GuestRow, RsvpStatus } from "@/lib/types";
import { event } from "@/config/event";

export type GuestDraft = {
  name: string;
  phone: string;
  notes: string;
  max_companions: number;
  status: RsvpStatus;
  companions: number;
  comment: string;
};

type Props = {
  mode: "new" | "edit" | "bulk";
  guest?: GuestRow;
  onClose: () => void;
  onSave: (d: GuestDraft, id?: string) => Promise<void>;
  onBulk: (text: string) => Promise<void>;
};

export default function GuestModal({ mode, guest, onClose, onSave, onBulk }: Props) {
  const [d, setD] = useState<GuestDraft>({
    name: guest?.name ?? "",
    phone: guest?.phone ?? "",
    notes: guest?.notes ?? "",
    max_companions: guest?.max_companions ?? event.rsvp.defaultMaxCompanions,
    status: guest?.status ?? "pending",
    companions: guest?.companions ?? 0,
    comment: guest?.comment ?? "",
  });
  const [bulk, setBulk] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof GuestDraft>(k: K, v: GuestDraft[K]) => setD((p) => ({ ...p, [k]: v }));
  const max = event.rsvp.maxCompanionsLimit;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "bulk") await onBulk(bulk);
      else {
        if (d.name.trim().length < 2) throw new Error("El nombre es obligatorio.");
        await onSave(d, guest?.id);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error inesperado";
      setError(msg.includes("companions_within_max") ? "Los acompañantes superan el máximo permitido." : msg);
    } finally {
      setBusy(false);
    }
  };

  const label = "mb-1.5 block font-sans text-[0.65rem] uppercase tracking-[0.18em] text-champagne/90";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92svh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-champagne/20 bg-ink-800 p-6 sm:rounded-3xl"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl">{mode === "bulk" ? "Carga masiva" : mode === "new" ? "Nuevo invitado" : "Editar invitado"}</h2>
          <button type="button" onClick={onClose} className="h-10 w-10 rounded-full text-xl text-silver-dim hover:text-pearl" aria-label="Cerrar">
            ✕
          </button>
        </div>

        {mode === "bulk" ? (
          <div className="mt-5">
            <p className="font-sans text-sm leading-relaxed text-pearl/70">
              Un invitado por línea. Opcionalmente agregá acompañantes máximos y teléfono separados por punto y coma:
            </p>
            <pre className="mt-2 rounded-xl bg-black/30 p-3 font-mono text-xs text-silver">
{`Familia Pérez; 3; 5491122334455
Lucía Fernández; 1
Martín Gómez`}
            </pre>
            <textarea className="field mt-3 min-h-[200px] font-mono text-sm" value={bulk} onChange={(e) => setBulk(e.target.value)} placeholder="Pegá aquí la lista…" />
            <p className="mt-2 font-sans text-xs text-silver-dim">Sin número se asignan {event.rsvp.defaultMaxCompanions} acompañante(s). Los nombres repetidos se omiten.</p>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <label className="block">
              <span className={label}>Nombre y apellido / familia</span>
              <input className="field !py-3" value={d.name} onChange={(e) => set("name", e.target.value)} maxLength={120} required />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className={label}>Acompañantes máx.</span>
                <input
                  className="field !py-3"
                  type="number"
                  min={0}
                  max={max}
                  value={d.max_companions}
                  onChange={(e) => set("max_companions", Math.max(0, Math.min(max, Number(e.target.value) || 0)))}
                />
              </label>
              <label className="block">
                <span className={label}>WhatsApp (opcional)</span>
                <input className="field !py-3" inputMode="tel" placeholder="5491122334455" value={d.phone} onChange={(e) => set("phone", e.target.value)} maxLength={40} />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className={label}>Estado</span>
                <select className="field !py-3" value={d.status} onChange={(e) => set("status", e.target.value as RsvpStatus)}>
                  <option value="pending">Pendiente</option>
                  <option value="confirmed">Confirmado</option>
                  <option value="declined">No asiste</option>
                </select>
              </label>
              <label className="block">
                <span className={label}>Acompañantes confirmados</span>
                <input
                  className="field !py-3 disabled:opacity-40"
                  type="number"
                  min={0}
                  max={d.max_companions}
                  disabled={d.status !== "confirmed"}
                  value={d.status === "confirmed" ? d.companions : 0}
                  onChange={(e) => set("companions", Math.max(0, Math.min(d.max_companions, Number(e.target.value) || 0)))}
                />
              </label>
            </div>
            <label className="block">
              <span className={label}>Comentario del invitado</span>
              <textarea className="field min-h-[70px] !py-3" value={d.comment} onChange={(e) => set("comment", e.target.value)} maxLength={500} />
            </label>
            <label className="block">
              <span className={label}>Notas internas (no las ve el invitado)</span>
              <textarea className="field min-h-[70px] !py-3" value={d.notes} onChange={(e) => set("notes", e.target.value)} maxLength={500} />
            </label>
          </div>
        )}

        {error && <p role="alert" className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>}

        <div className="mt-6 flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 rounded-full border border-white/15 py-3.5 font-sans text-xs uppercase tracking-[0.15em]">
            Cancelar
          </button>
          <button disabled={busy} className="flex-1 rounded-full bg-champagne py-3.5 font-sans text-xs font-medium uppercase tracking-[0.15em] text-ink disabled:opacity-50">
            {busy ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
}
