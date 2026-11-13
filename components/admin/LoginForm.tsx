"use client";
import { useEffect, useState } from "react";
import { getBrowserClient } from "@/lib/supabase/browser";
import { Monogram } from "@/components/Ornaments";

export default function LoginForm({ configured, notAdmin }: { configured: boolean; notAdmin: boolean }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(notAdmin ? "Esta cuenta no tiene permisos de administración." : null);

  // Si entró alguien sin permisos, cerramos su sesión
  useEffect(() => {
    if (notAdmin && configured) getBrowserClient().auth.signOut();
  }, [notAdmin, configured]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = getBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setError(
        error.message.includes("Invalid")
          ? "Email o contraseña incorrectos."
          : error.message.includes("fetch")
            ? "No se pudo conectar con el servidor. Revisá tu conexión."
            : error.message,
      );
      setLoading(false);
      return;
    }
    // El servidor decide si es admin (proxy + página)
    window.location.href = "/admin";
  };

  return (
    <main className="flex min-h-[100svh] items-center justify-center px-5">
      <div className="glass w-full max-w-sm rounded-3xl px-7 py-10">
        <div className="flex justify-center"><Monogram size={72} /></div>
        <h1 className="mt-5 text-center font-serif text-3xl">Panel privado</h1>
        <p className="mt-1 text-center font-sans text-sm text-silver-dim">Acceso solo para la familia</p>

        {!configured ? (
          <div className="mt-8 rounded-2xl border border-amber-300/30 bg-amber-400/10 p-4 font-sans text-sm leading-relaxed text-amber-100">
            Supabase todavía no está configurado. Cargá las variables <code>NEXT_PUBLIC_SUPABASE_URL</code> y{" "}
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> (ver README) y volvé a desplegar.
          </div>
        ) : (
          <form onSubmit={submit} className="mt-8 space-y-4">
            <input className="field" type="email" autoComplete="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input className="field" type="password" autoComplete="current-password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} required />
            {error && <p role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>}
            <button className="btn-gold w-full" disabled={loading}>
              <span className="relative z-10">{loading ? "Ingresando…" : "Ingresar"}</span>
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
