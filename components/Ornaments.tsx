import { event } from "@/config/event";

/** Monograma "XV" con aro dorado */
export function Monogram({ size = 120, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" className={className} aria-hidden>
      <defs>
        <linearGradient id="mg-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#a8854a" />
          <stop offset=".35" stopColor="#f6e7c1" />
          <stop offset=".6" stopColor="#d9bc84" />
          <stop offset="1" stopColor="#8a6a36" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="57" fill="none" stroke="url(#mg-gold)" strokeWidth=".8" />
      <circle cx="60" cy="60" r="52" fill="none" stroke="url(#mg-gold)" strokeWidth=".4" strokeDasharray="1 3" />
      <g fill="url(#mg-gold)">
        <path d="M60 1.5l2 3.5-2 3.5-2-3.5z" />
        <path d="M60 111.5l2 3.5-2 3.5-2-3.5z" />
      </g>
      <text x="60" y="73" textAnchor="middle" fontFamily="Cormorant Garamond, serif" fontSize="40" fontWeight="400" letterSpacing="2" fill="url(#mg-gold)">
        XV
      </text>
      <text x="60" y="88" textAnchor="middle" fontFamily="Jost, sans-serif" fontSize="5.2" letterSpacing="3.2" fill="#d9bc84" opacity=".85">
        {event.name.toUpperCase()}
      </text>
    </svg>
  );
}

/** Separador ornamental: línea – rombo – línea */
export function Divider({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-4 ${className}`} aria-hidden>
      <span className="hairline w-16 sm:w-24" />
      <svg width="18" height="18" viewBox="0 0 18 18">
        <path d="M9 0l3 9-3 9-3-9z" fill="#d9bc84" opacity=".9" />
        <path d="M0 9l9-2.2L18 9 9 11.2z" fill="#f3dca6" opacity=".55" />
      </svg>
      <span className="hairline w-16 sm:w-24" />
    </div>
  );
}

/** Esquinas art-déco para marcos */
export function Corners() {
  const c = "absolute h-6 w-6 border-champagne/60";
  return (
    <>
      <span className={`${c} left-3 top-3 border-l border-t`} />
      <span className={`${c} right-3 top-3 border-r border-t`} />
      <span className={`${c} bottom-3 left-3 border-b border-l`} />
      <span className={`${c} bottom-3 right-3 border-b border-r`} />
    </>
  );
}

/** Fondo con profundidad: halos de luz, haces giratorios y viñeta */
export function Backdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-ink" />
      <div className="absolute -top-[30%] left-1/2 h-[80vh] w-[140vw] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(217,188,132,.16),transparent)]" />
      <div className="absolute -bottom-[35%] left-1/2 h-[70vh] w-[120vw] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(201,204,211,.08),transparent)]" />
      <div className="absolute left-1/2 top-[-60vmax] h-[180vmax] w-[180vmax] -translate-x-1/2 animate-spinSlow opacity-[.07] [background:conic-gradient(from_0deg,transparent_0deg,#f3dca6_8deg,transparent_18deg,transparent_120deg,#f3dca6_128deg,transparent_140deg,transparent_240deg,#c9ccd3_246deg,transparent_258deg)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,.75)_100%)]" />
    </div>
  );
}
