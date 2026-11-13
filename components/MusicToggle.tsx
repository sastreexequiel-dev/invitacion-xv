"use client";
import { motion } from "framer-motion";

/** Botón flotante de sonido con ecualizador animado cuando suena */
export default function MusicToggle({ playing, onToggle }: { playing: boolean; onToggle: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={onToggle}
      aria-pressed={playing}
      aria-label={playing ? "Pausar música" : "Activar música"}
      className="glass fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full"
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 1.6, duration: 0.6 }}
      whileTap={{ scale: 0.9 }}
    >
      {playing && <span className="absolute inset-0 animate-ping rounded-full border border-champagne/30 [animation-duration:2.4s]" />}
      <span className="flex h-5 items-end gap-[3px]" aria-hidden>
        {[0, 0.25, 0.5, 0.15].map((d, i) => (
          <span
            key={i}
            className={`w-[3px] origin-bottom rounded-full bg-champagne ${playing ? "animate-eq" : ""}`}
            style={{ height: "100%", animationDelay: `${d}s`, transform: playing ? undefined : `scaleY(${[0.35, 0.6, 0.45, 0.3][i]})` }}
          />
        ))}
      </span>
      {!playing && <span className="absolute h-[1.5px] w-8 rotate-45 rounded bg-champagne/80" aria-hidden />}
    </motion.button>
  );
}
