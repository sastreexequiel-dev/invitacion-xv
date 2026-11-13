import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { event } from "@/config/event";
import { eventDate } from "@/lib/format";

// Imagen de vista previa para WhatsApp / redes (Open Graph), generada
// automáticamente con los datos de config/event.ts.
export const alt = event.share.title;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const font = (pkg: string, file: string) => readFile(join(process.cwd(), "node_modules/@fontsource", pkg, "files", file));

export default async function OgImage() {
  const [script, serif, sans] = await Promise.all([
    font("pinyon-script", "pinyon-script-latin-400-normal.woff"),
    font("cormorant-garamond", "cormorant-garamond-latin-400-normal.woff"),
    font("jost", "jost-latin-400-normal.woff"),
  ]);
  const gold = "linear-gradient(100deg, #a8854a, #f6e7c1 30%, #d9bc84 55%, #fff3d6 70%, #a8854a)";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          background: "radial-gradient(ellipse at 50% 35%, #2a2216 0%, #0c0b10 55%, #050407 100%)", position: "relative", color: "#fbf8f2",
        }}
      >
        <div style={{ position: "absolute", inset: 28, border: "1px solid rgba(217,188,132,.45)", display: "flex" }} />
        <div style={{ position: "absolute", inset: 40, border: "1px solid rgba(217,188,132,.18)", display: "flex" }} />
        {[[90, 110, 6], [1080, 140, 4], [180, 500, 3], [1010, 480, 6], [600, 80, 3], [320, 170, 2], [880, 560, 3]].map(([x, y, r], i) => (
          <div key={i} style={{ position: "absolute", left: x, top: y, width: r * 2, height: r * 2, borderRadius: 99, background: "#f3dca6", boxShadow: `0 0 ${r * 6}px ${r * 2}px rgba(243,220,166,.55)`, display: "flex" }} />
        ))}
        <div style={{ fontFamily: "Jost", fontSize: 24, letterSpacing: 12, color: "#d9bc84", display: "flex" }}>
          {event.welcomeTitle.toUpperCase()}
        </div>
        <div style={{ fontFamily: "Pinyon", fontSize: 210, lineHeight: 1.15, backgroundImage: gold, backgroundClip: "text", color: "transparent", display: "flex", padding: "0 40px" }}>
          {event.name}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 28, marginTop: 6 }}>
          <div style={{ width: 120, height: 1, background: "linear-gradient(90deg, transparent, #d9bc84)", display: "flex" }} />
          <div style={{ fontFamily: "Cormorant", fontSize: 40, letterSpacing: 8, color: "#e6e7ea", display: "flex" }}>
            {`${eventDate.day} · ${eventDate.monthNum} · ${eventDate.year}`}
          </div>
          <div style={{ width: 120, height: 1, background: "linear-gradient(90deg, #d9bc84, transparent)", display: "flex" }} />
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Pinyon", data: script, style: "normal", weight: 400 },
        { name: "Cormorant", data: serif, style: "normal", weight: 400 },
        { name: "Jost", data: sans, style: "normal", weight: 400 },
      ],
    },
  );
}
