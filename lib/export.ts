import type { GuestRow } from "@/lib/types";

export const STATUS_LABEL: Record<GuestRow["status"], string> = {
  pending: "Pendiente",
  confirmed: "Confirmado",
  declined: "No asiste",
};

const HEADERS = [
  "Nombre",
  "Estado",
  "Acompañantes",
  "Acompañantes máx.",
  "Total personas",
  "Comentario",
  "Teléfono",
  "Notas internas",
  "Origen",
  "Código",
  "Enlace personal",
  "Fecha de respuesta",
  "Creado",
];

const people = (g: GuestRow) => (g.status === "confirmed" ? 1 + g.companions : 0);
const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Argentina/Buenos_Aires" }) : "";

function rowValues(g: GuestRow, origin: string) {
  return [
    g.name,
    STATUS_LABEL[g.status],
    g.companions,
    g.max_companions,
    people(g),
    g.comment ?? "",
    g.phone ?? "",
    g.notes ?? "",
    g.source === "open" ? "Enlace general" : "Panel",
    g.code,
    `${origin}/invitacion?invitado=${g.code}`,
    fmtDate(g.responded_at),
    fmtDate(g.created_at),
  ];
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const stamp = () => new Date().toISOString().slice(0, 10);

/** CSV con BOM UTF-8 y separador ";" (Excel en español lo abre bien con acentos) */
export function exportCsv(rows: GuestRow[], origin: string) {
  const esc = (v: unknown) => {
    let s = String(v ?? "");
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // evita inyección de fórmulas en Excel
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [HEADERS, ...rows.map((g) => rowValues(g, origin))].map((r) => r.map(esc).join(";"));
  download(new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" }), `invitados-${stamp()}.csv`);
}

/** Excel .xlsx real, con encabezados en negrita y anchos de columna */
export async function exportXlsx(rows: GuestRow[], origin: string) {
  const { default: writeXlsxFile } = await import("write-excel-file/browser");
  const header = HEADERS.map((h) => ({ value: h, fontWeight: "bold" as const, backgroundColor: "#F3E3BF" }));
  const data = rows.map((g) =>
    rowValues(g, origin).map((v) => ({ value: v as string | number })),
  );
  const totals = [
    { value: "TOTAL ASISTENTES", fontWeight: "bold" as const },
    { value: "" },
    { value: "" },
    { value: "" },
    { value: rows.reduce((n, g) => n + people(g), 0), fontWeight: "bold" as const },
  ];
  const blob = await writeXlsxFile([header, ...data, [], totals], {
    columns: [{ width: 28 }, { width: 13 }, { width: 13 }, { width: 16 }, { width: 14 }, { width: 40 }, { width: 16 }, { width: 30 }, { width: 15 }, { width: 13 }, { width: 50 }, { width: 18 }, { width: 18 }],
    sheet: "Invitados",
  }).toBlob();
  download(blob, `invitados-${stamp()}.xlsx`);
}
