"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { getTimeLeft, type TimeLeft } from "@/lib/countdown";
import { event } from "@/config/event";

function Unit({ value, label }: { value: number | null; label: string }) {
  const text = value === null ? "--" : String(value).padStart(2, "0");
  return (
    <div className="glass relative flex aspect-[4/5] flex-col items-center justify-center overflow-hidden rounded-2xl">
      <div className="absolute inset-x-0 top-1/2 h-px bg-white/5" />
      <div className="relative h-[1.1em] overflow-hidden font-serif text-[clamp(2.4rem,11vw,4rem)] font-light leading-none tabular-nums">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={text}
            className="text-gold block"
            initial={{ y: "-100%", opacity: 0, filter: "blur(4px)" }}
            animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
            exit={{ y: "100%", opacity: 0, filter: "blur(4px)" }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            {text}
          </motion.span>
        </AnimatePresence>
      </div>
      <span className="mt-2 font-sans text-[0.58rem] uppercase tracking-[0.32em] text-silver-dim">{label}</span>
    </div>
  );
}

/** Cuenta regresiva en tiempo real hasta event.date */
export default function Countdown({ target }: { target: number }) {
  // null en el servidor → evita diferencias de hidratación
  const [t, setT] = useState<TimeLeft | null>(null);

  useEffect(() => {
    const update = () => setT(getTimeLeft(target, Date.now()));
    update();
    // Se alinea con el cambio de segundo del reloj
    let id: ReturnType<typeof setInterval>;
    const align = setTimeout(() => {
      update();
      id = setInterval(update, 1000);
    }, 1000 - (Date.now() % 1000));
    return () => { clearTimeout(align); clearInterval(id); };
  }, [target]);

  if (t?.done) {
    return (
      <motion.div
        className="glass mx-auto max-w-md rounded-3xl px-8 py-12 text-center"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <p className="font-script text-6xl text-gold">¡Llegó el día!</p>
        <p className="mt-4 font-serif text-xl italic text-pearl/85">{event.eventDayMessage}</p>
      </motion.div>
    );
  }

  return (
    <div className="mx-auto grid max-w-lg grid-cols-4 gap-2.5 sm:gap-4" role="timer" aria-live="off">
      <Unit value={t?.days ?? null} label="Días" />
      <Unit value={t?.hours ?? null} label="Horas" />
      <Unit value={t?.minutes ?? null} label="Min" />
      <Unit value={t?.seconds ?? null} label="Seg" />
    </div>
  );
}
