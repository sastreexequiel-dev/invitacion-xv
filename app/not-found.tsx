import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-[100svh] flex-col items-center justify-center px-6 text-center">
      <p className="eyebrow">Página no encontrada</p>
      <p className="mt-4 font-script text-6xl text-gold">Ups…</p>
      <Link href="/" className="btn-ghost mt-8">Ir a la invitación</Link>
    </main>
  );
}
