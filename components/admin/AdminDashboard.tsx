"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getBrowserClient } from "@/lib/supabase/browser";
import type { GuestRow, RsvpStatus } from "@/lib/types";
import { exportCsv, exportXlsx, STATUS_LABEL } from "@/lib/export";
import { event } from "@/config/event";
import GuestModal, { type GuestDraft } from "./GuestModal";

type Filter = "all" | RsvpStatus;

const badge: Record<RsvpStatus, string> = {
  confirmed: "bg-emerald-400/15 text-emerald-200 border-emerald-300/30",
  declined: "bg-rose-400/15 text-rose-200 border-rose-300/30",
  pending: "bg-amber-300/10 text-amber-100 border-amber-200/25",
};

const fmt = (s: string | null) =>
  s ? new Date(s).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default function AdminDashboard({ email }: { email: string }) {
  const supabase = useMemo(() => getBrowserClient(), []);
  const [rows, setRows] = useState<GuestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [modal, setModal] = useState<{ mode: "new" | "edit" | "bulk"; guest?: GuestRow } | null>(null);
  const [origin, setOrigin] = useState("");

  useEffect(() => setOrigin((process.env.NEXT_PUBLIC_SITE_URL || window.location.origin).replace(/\/$/, "")), []);

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2600);
  };

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("guests").select("*").order("created_at", { ascending: false });
    if (error) setError(error.message);
    else {
      setRows((data ?? []) as GuestRow[]);
      setError(null);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => {
    const confirmed = rows.filter((r) => r.status === "confirmed");
    const companions = confirmed.reduce((n, r) => n + r.companions, 0);
    return {
      total: rows.length,
      confirmed: confirmed.length,
      declined: rows.filter((r) => r.status === "declined").length,
      pending: rows.filter((r) => r.status === "pending").length,
      companions,
      attendees: confirmed.length + companions,
      seats: rows.reduce((n, r) => n + 1 + r.max_companions, 0),
    };
  }, [rows]);

  const visible = useMemo(() => {
    const nq = norm(q.trim());
    return rows.filter((r) => (filter === "all" || r.status === filter) && (!nq || norm(r.name).includes(nq) || r.code.includes(q.trim().toUpperCase())));
  }, [rows, q, filter]);

  const link = (g: GuestRow) => `${origin}/invitacion?invitado=${g.code}`;

  const whatsapp = (g: GuestRow) => {
    const text = `¡Hola ${g.name.split(" ")[0]}! ✨ Te invito a mis 15 años. Abrí tu invitación y confirmá tu asistencia acá:\n${link(g)}`;
    const phone = (g.phone ?? "").replace(/\D/g, "");
    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  };

  const copy = async (g: GuestRow) => {
    try {
      await navigator.clipboard.writeText(link(g));
      flash("Enlace copiado");
    } catch {
      prompt("Copiá el enlace:", link(g));
    }
  };

  const save = async (draft: GuestDraft, id?: string) => {
    const payload = {
      name: draft.name.trim(),
      phone: draft.phone.trim() || null,
      notes: draft.notes.trim() || null,
      max_companions: draft.max_companions,
      status: draft.status,
      companions: draft.status === "confirmed" ? Math.min(draft.companions, draft.max_companions) : 0,
      comment: draft.comment.trim() || null,
    };
    if (id) {
      const prev = rows.find((r) => r.id === id);
      const responded_at =
        payload.status === "pending" ? null : prev?.status !== payload.status || !prev?.responded_at ? new Date().toISOString() : prev.responded_at;
      const { error } = await supabase.from("guests").update({ ...payload, responded_at }).eq("id", id);
      if (error) throw new Error(error.message);
      flash("Cambios guardados");
    } else {
      const { error } = await supabase
        .from("guests")
        .insert({ ...payload, responded_at: payload.status === "pending" ? null : new Date().toISOString() });
      if (error) throw new Error(error.message);
      flash("Invitado agregado");
    }
    setModal(null);
    load();
  };

  const bulkSave = async (text: string) => {
    const items = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const [name, comp, phone] = l.split(/[;\t]/).map((s) => s?.trim());
        const max = Number.parseInt(comp ?? "", 10);
        return {
          name,
          max_companions: Number.isFinite(max) ? Math.max(0, Math.min(event.rsvp.maxCompanionsLimit, max)) : event.rsvp.defaultMaxCompanions,
          phone: phone || null,
        };
      })
      .filter((i) => i.name && i.name.length >= 2);
    if (!items.length) throw new Error("No hay nombres válidos.");
    const existing = new Set(rows.map((r) => norm(r.name).replace(/\s+/g, " ")));
    const fresh = items.filter((i) => !existing.has(norm(i.name).replace(/\s+/g, " ")));
    if (!fresh.length) throw new Error("Todos esos nombres ya están cargados.");
    const { error } = await supabase.from("guests").insert(fresh);
    if (error) throw new Error(error.message);
    flash(`${fresh.length} invitados agregados${items.length > fresh.length ? ` (${items.length - fresh.length} repetidos omitidos)` : ""}`);
    setModal(null);
    load();
  };

  const remove = async (g: GuestRow) => {
    if (!confirm(`¿Eliminar a "${g.name}"? Esta acción no se puede deshacer.`)) return;
    const { error } = await supabase.from("guests").delete().eq("id", g.id);
    if (error) return flash("Error: " + error.message);
    flash("Invitado eliminado");
    setRows((r) => r.filter((x) => x.id !== g.id));
  };

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/admin/login";
  };

  const cards: { label: string; value: number; tone: string; f?: Filter }[] = [
    { label: "Invitaciones", value: stats.total, tone: "text-pearl", f: "all" },
    { label: "Confirmados", value: stats.confirmed, tone: "text-emerald-200", f: "confirmed" },
    { label: "No asisten", value: stats.declined, tone: "text-rose-200", f: "declined" },
    { label: "Pendientes", value: stats.pending, tone: "text-amber-100", f: "pending" },
    { label: "Acompañantes", value: stats.companions, tone: "text-silver" },
    { label: "Total asistentes", value: stats.attendees, tone: "text-gold" },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-6">
      {/* Encabezado */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Panel privado</p>
          <h1 className="font-serif text-3xl sm:text-4xl">
            XV de <span className="text-gold font-script text-5xl">{event.name}</span>
          </h1>
        </div>
        <div className="flex items-center gap-3 font-sans text-xs text-silver-dim">
          <span className="hidden sm:inline">{email}</span>
          <button onClick={logout} className="rounded-full border border-white/15 px-4 py-2 hover:border-champagne/60 hover:text-champagne-light">
            Salir
          </button>
        </div>
      </header>

      {/* Indicadores */}
      <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6" aria-label="Indicadores">
        {cards.map((c) => (
          <button
            key={c.label}
            onClick={() => c.f && setFilter(c.f)}
            className={`glass rounded-2xl px-4 py-4 text-left transition ${c.f ? "hover:border-champagne/50" : "cursor-default"} ${c.f && filter === c.f ? "ring-1 ring-champagne/60" : ""}`}
          >
            <p className="font-sans text-[0.65rem] uppercase tracking-[0.18em] text-silver-dim">{c.label}</p>
            <p className={`mt-1 font-serif text-4xl tabular-nums ${c.tone}`}>{c.value}</p>
          </button>
        ))}
      </section>
      <p className="mt-3 font-sans text-xs text-silver-dim">
        Lugares asignados: <b className="text-pearl/80">{stats.seats}</b> · Cupo previsto: {event.rsvp.expectedGuests} ·
        Respondieron: {stats.total ? Math.round(((stats.confirmed + stats.declined) / stats.total) * 100) : 0}%
      </p>

      {/* Barra de herramientas */}
      <section className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <input className="field !py-3 pl-11" placeholder="Buscar por nombre o código…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar invitado" />
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-silver-dim" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </div>
        <div className="flex gap-1 overflow-x-auto rounded-full border border-white/10 bg-white/[0.03] p-1">
          {(["all", "confirmed", "declined", "pending"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`whitespace-nowrap rounded-full px-4 py-2 font-sans text-xs transition ${filter === f ? "bg-champagne text-ink" : "text-pearl/70 hover:text-pearl"}`}
            >
              {{ all: "Todos", confirmed: "Confirmados", declined: "No asisten", pending: "Pendientes" }[f]}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-3 flex flex-wrap gap-2">
        <button onClick={() => setModal({ mode: "new" })} className="rounded-full bg-champagne px-5 py-2.5 font-sans text-xs font-medium uppercase tracking-[0.15em] text-ink hover:bg-champagne-light">
          + Invitado
        </button>
        <button onClick={() => setModal({ mode: "bulk" })} className="rounded-full border border-champagne/50 px-5 py-2.5 font-sans text-xs uppercase tracking-[0.15em] text-champagne-light hover:bg-champagne/10">
          Carga masiva
        </button>
        <span className="flex-1" />
        <button onClick={() => exportXlsx(visible, origin)} disabled={!visible.length} className="rounded-full border border-white/15 px-5 py-2.5 font-sans text-xs uppercase tracking-[0.15em] hover:border-champagne/60 disabled:opacity-40">
          Excel
        </button>
        <button onClick={() => exportCsv(visible, origin)} disabled={!visible.length} className="rounded-full border border-white/15 px-5 py-2.5 font-sans text-xs uppercase tracking-[0.15em] hover:border-champagne/60 disabled:opacity-40">
          CSV
        </button>
        <button onClick={load} className="rounded-full border border-white/15 px-4 py-2.5 font-sans text-xs hover:border-champagne/60" aria-label="Actualizar">
          ↻
        </button>
      </section>

      {error && <p className="mt-6 rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">Error al cargar: {error}</p>}

      {/* Lista */}
      <section className="mt-5">
        {loading ? (
          <p className="py-16 text-center font-serif text-xl italic text-silver-dim">Cargando invitados…</p>
        ) : visible.length === 0 ? (
          <p className="py-16 text-center font-serif text-xl italic text-silver-dim">{rows.length ? "No hay resultados con ese filtro." : "Todavía no hay invitados. Agregá el primero."}</p>
        ) : (
          <>
            {/* Tabla escritorio */}
            <div className="glass hidden overflow-hidden rounded-2xl md:block">
              <table className="w-full font-sans text-sm">
                <thead className="border-b border-white/10 text-left text-[0.65rem] uppercase tracking-[0.15em] text-silver-dim">
                  <tr>
                    <th className="px-4 py-3 font-normal">Invitado</th>
                    <th className="px-4 py-3 font-normal">Estado</th>
                    <th className="px-4 py-3 font-normal">Acomp.</th>
                    <th className="px-4 py-3 font-normal">Comentario</th>
                    <th className="px-4 py-3 font-normal">Respuesta</th>
                    <th className="px-4 py-3 text-right font-normal">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((g) => (
                    <tr key={g.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                      <td className="px-4 py-3">
                        <p className="text-pearl">{g.name}</p>
                        <p className="font-mono text-[0.68rem] text-silver-dim">
                          {g.code}
                          {g.source === "open" && <span className="ml-2 rounded bg-white/5 px-1.5 py-0.5 font-sans">enlace general</span>}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full border px-2.5 py-1 text-xs ${badge[g.status]}`}>{STATUS_LABEL[g.status]}</span>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-pearl/80">
                        {g.companions}/{g.max_companions}
                      </td>
                      <td className="max-w-[240px] truncate px-4 py-3 text-pearl/60" title={g.comment ?? ""}>
                        {g.comment || "—"}
                      </td>
                      <td className="px-4 py-3 text-pearl/60">{fmt(g.responded_at)}</td>
                      <td className="px-4 py-3">
                        <RowActions g={g} onCopy={copy} wa={whatsapp(g)} onEdit={() => setModal({ mode: "edit", guest: g })} onDelete={() => remove(g)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Tarjetas móvil */}
            <ul className="space-y-3 md:hidden">
              {visible.map((g) => (
                <li key={g.id} className="glass rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-serif text-xl text-pearl">{g.name}</p>
                      <p className="font-mono text-[0.68rem] text-silver-dim">{g.code}</p>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2.5 py-1 font-sans text-xs ${badge[g.status]}`}>{STATUS_LABEL[g.status]}</span>
                  </div>
                  <p className="mt-2 font-sans text-sm text-pearl/70">
                    Acompañantes: {g.companions}/{g.max_companions} · {fmt(g.responded_at)}
                  </p>
                  {g.comment && <p className="mt-1 font-sans text-sm italic text-pearl/55">“{g.comment}”</p>}
                  <div className="mt-3">
                    <RowActions g={g} onCopy={copy} wa={whatsapp(g)} onEdit={() => setModal({ mode: "edit", guest: g })} onDelete={() => remove(g)} />
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {modal && (
        <GuestModal
          mode={modal.mode}
          guest={modal.guest}
          onClose={() => setModal(null)}
          onSave={save}
          onBulk={bulkSave}
        />
      )}

      {toast && (
        <div className="glass fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full px-5 py-3 font-sans text-sm text-champagne-light" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}

function RowActions({ g, onCopy, wa, onEdit, onDelete }: { g: GuestRow; onCopy: (g: GuestRow) => void; wa: string; onEdit: () => void; onDelete: () => void }) {
  const btn = "rounded-lg border border-white/10 px-3 py-2 font-sans text-xs text-pearl/80 transition hover:border-champagne/60 hover:text-champagne-light";
  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      <button className={btn} onClick={() => onCopy(g)} title="Copiar enlace personal">Enlace</button>
      <a className={btn} href={wa} target="_blank" rel="noopener noreferrer" title="Enviar por WhatsApp">WhatsApp</a>
      <button className={btn} onClick={onEdit}>Editar</button>
      <button className={`${btn} hover:!border-rose-400/60 hover:!text-rose-200`} onClick={onDelete} aria-label={`Eliminar ${g.name}`}>✕</button>
    </div>
  );
}
