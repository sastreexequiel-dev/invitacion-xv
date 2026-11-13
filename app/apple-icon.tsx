import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Ícono para "Agregar a pantalla de inicio" en iPhone
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0c0b10" }}>
        <div style={{ width: 140, height: 140, borderRadius: 999, border: "3px solid #d9bc84", display: "flex", alignItems: "center", justifyContent: "center", color: "#f3dca6", fontSize: 64, fontFamily: "serif", letterSpacing: 2 }}>
          XV
        </div>
      </div>
    ),
    size,
  );
}
