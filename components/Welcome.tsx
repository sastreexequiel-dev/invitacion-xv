"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { event } from "@/config/event";
import { Monogram } from "./Ornaments";
import Particles from "./Particles";

const ease = [0.22, 1, 0.36, 1] as const;

/**
 * Pantalla de bienvenida: línea de luz que se abre, monograma, frase,
 * nombre que aparece letra por letra y botón "ABRIR INVITACIÓN".
 * Al abrir, el contenido se desvanece y dos paneles se separan como un telón.
 */
export default function Welcome({ guestName, onOpen }: { guestName?: string; onOpen: () => void }) {
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(false);
  const letters = Array.from(event.name);

  const open = () => {
    if (leaving) return;
    setLeaving(true);
    onOpen(); // arranca la música dentro del gesto del usuario
    setTimeout(() => setGone(true), 1900);
  };

  if (gone) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-label="Bienvenida">
      {/* Telón: dos paneles que se separan */}
      <motion.div
        className="absolute inset-x-0 top-0 h-1/2 bg-ink"
        animate={leaving ? { y: "-100%" } : { y: 0 }}
        transition={{ duration: 1.2, ease: [0.76, 0, 0.24, 1], delay: 0.55 }}
      />
      <motion.div
        className="absolute inset-x-0 bottom-0 h-1/2 bg-ink"
        animate={leaving ? { y: "100%" } : { y: 0 }}
        transition={{ duration: 1.2, ease: [0.76, 0, 0.24, 1], delay: 0.55 }}
      />
      {/* Destello en la unión del telón */}
      <AnimatePresence>
        {leaving && (
          <motion.div
            className="absolute left-0 right-0 top-1/2 h-[2px] -translate-y-1/2 bg-gradient-to-r from-transparent via-champagne-light to-transparent shadow-[0_0_40px_8px_rgba(243,220,166,.45)]"
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: [0, 1, 1, 0] }}
            transition={{ duration: 1.4, ease, times: [0, 0.3, 0.6, 1] }}
          />
        )}
      </AnimatePresence>

      <motion.div
        className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden px-6 text-center"
        animate={leaving ? { opacity: 0, scale: 1.04, filter: "blur(6px)" } : { opacity: 1 }}
        transition={{ duration: 0.6, ease }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_42%,rgba(217,188,132,.18),transparent_60%)]" />
        <div className="absolute inset-0 opacity-80">
          <Particles density={0.8} />
        </div>
        {/* Haz de luz que barre la pantalla una vez */}
        <motion.div
          className="pointer-events-none absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/[0.07] to-transparent"
          initial={{ x: "-150%", skewX: -18 }}
          animate={{ x: "400%" }}
          transition={{ duration: 2.4, delay: 2.2, ease: "easeInOut" }}
        />

        <div className="relative flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.6, rotate: -20 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 1.6, ease, delay: 0.3 }}
          >
            <Monogram size={96} />
          </motion.div>

          <motion.div
            className="hairline mt-8 w-56"
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ duration: 1.4, ease, delay: 0.7 }}
          />

          <motion.p
            className="eyebrow mt-6 max-w-xs leading-loose"
            initial={{ opacity: 0, letterSpacing: "0.6em" }}
            animate={{ opacity: 1, letterSpacing: "0.38em" }}
            transition={{ duration: 1.8, ease, delay: 1.1 }}
          >
            {event.welcomeTitle}
          </motion.p>

          <h1 className="mt-5 overflow-visible font-script text-[clamp(4.2rem,22vw,9rem)] leading-[1.05]" aria-label={event.name}>
            {letters.map((ch, i) => (
              <motion.span
                key={i}
                aria-hidden
                className="text-gold -mx-[0.12em] inline-block px-[0.14em] py-[0.12em]"
                initial={{ opacity: 0, y: 24, filter: "blur(14px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 1.1, ease, delay: 1.7 + i * 0.09 }}
              >
                {ch === " " ? " " : ch}
              </motion.span>
            ))}
          </h1>

          {guestName && (
            <motion.p
              className="mt-2 font-serif text-lg italic text-silver"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.2, delay: 2.6 }}
            >
              Para {guestName}
            </motion.p>
          )}

          <motion.div
            className="hairline mt-6 w-40"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 1.2, ease, delay: 2.5 }}
          />

          <motion.button
            type="button"
            onClick={open}
            className="btn-gold mt-12"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease, delay: 3 }}
            whileHover={{ scale: 1.03 }}
          >
            <span className="relative z-10">Abrir invitación</span>
          </motion.button>

          <motion.p
            className="mt-6 font-sans text-[0.62rem] uppercase tracking-[0.3em] text-white/35"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 3.6, duration: 1 }}
          >
            ♪ Con música · subí el volumen
          </motion.p>
        </div>
      </motion.div>
    </div>
  );
}
