import type { Metadata, Viewport } from "next";
import "@fontsource/pinyon-script/400.css";
import "@fontsource/cormorant-garamond/300.css";
import "@fontsource/cormorant-garamond/400.css";
import "@fontsource/cormorant-garamond/400-italic.css";
import "@fontsource/cormorant-garamond/500.css";
import "@fontsource/jost/300.css";
import "@fontsource/jost/400.css";
import "@fontsource/jost/500.css";
import "./globals.css";
import { event } from "@/config/event";
import { SITE_URL } from "@/lib/env";

export const metadata: Metadata = {
  metadataBase: SITE_URL ? new URL(SITE_URL) : undefined,
  title: event.share.title,
  description: event.share.description,
  applicationName: event.share.title,
  openGraph: {
    type: "website",
    locale: "es_AR",
    title: event.share.title,
    description: event.share.description,
    siteName: event.share.title,
    ...(event.shareImage ? { images: [{ url: event.shareImage, width: 1200, height: 630 }] } : {}),
  },
  twitter: {
    card: "summary_large_image",
    title: event.share.title,
    description: event.share.description,
  },
  // Invitación privada: no aparece en buscadores
  robots: { index: false, follow: false },
  formatDetection: { telephone: false, address: false, email: false },
};

export const viewport: Viewport = {
  themeColor: "#07060a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
