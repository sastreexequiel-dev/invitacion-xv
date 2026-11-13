import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Panel de invitados",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-[100svh] bg-ink-900 text-pearl">{children}</div>;
}
