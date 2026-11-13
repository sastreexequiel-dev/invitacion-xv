"use client";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { event } from "@/config/event";
import { eventDate } from "@/lib/format";
import type { PublicGuest } from "@/lib/types";
import Welcome from "./Welcome";
import Particles from "./Particles";
import MusicToggle from "./MusicToggle";
import Countdown from "./Countdown";
import EventDetails from "./EventDetails";
import RsvpForm from "./RsvpForm";
import Reveal from "./Reveal";
import { useMusic } from "./useMusic";
import { Backdrop, Corners, Divider, Monogram } from "./Ornaments";

const ease = [0.22, 1, 0.36, 1] as const;

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <Reveal className="mb-10 text-center">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="text-gold mt-3 font-script text-[clamp(3rem,13vw,5rem)] leading-tight">{title}</h2>
      <Divider className="mt-3" />
    </Reveal>
  );
}

export default function Invitation({ guest, invalidCode }: { guest: PublicGuest | null; invalidCode: boolean }) {
  const [opened, setOpened] = useState(false);
  const music = useMusic();

  useEffect(() => {
    document.body.classList.toggle("locked", !opened);
    return () => document.body.classList.remove("locked");
  }, [opened]);

  const handleOpen = () => {
    music.play();
    setOpened(true);
  };

  return (
    <div className="grain relative">
      <Backdrop />
      <div className="pointer-events-none fixed inset-0 z-0">
        {opened && <Particles density={0.7} />}
      </div>

      <Welcome guestName={guest?.name.split(" ")[0]} onOpen={handleOpen} />
      {opened && <MusicToggle playing={music.playing} onToggle={music.toggle} />}

      <main className="relative z-10" aria-hidden={!opened}>
        {/* ── PORTADA ─────────────────────────────────────────── */}
        <section className="relative flex min-h-[100svh] flex-col items-center justify-center px-6 pb-28 pt-14 text-center">
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={opened ? { opacity: 1, y: 0, scale: 1 } : {}}
            transition={{ duration: 1.6, ease, delay: 1.0 }}
            className="relative"
          >
            {/* Arco editorial */}
            <div className="relative mx-auto h-[min(42svh,400px)] w-[min(64vw,290px)] overflow-hidden rounded-t-full border border-champagne/40 p-2 shadow-[0_0_80px_-20px_rgba(217,188,132,.5)]">
              <div className="relative h-full w-full overflow-hidden rounded-t-full bg-gradient-to-b from-ink-700 via-ink-900 to-ink">
                {event.heroImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={event.heroImage} alt={event.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(243,220,166,.22),transparent_60%)]" />
                    <Monogram size={170} className="relative" />
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-ink/90 to-transparent" />
              </div>
            </div>
          </motion.div>

          <motion.p
            className="eyebrow mt-8"
            initial={{ opacity: 0 }}
            animate={opened ? { opacity: 1 } : {}}
            transition={{ duration: 1.2, delay: 1.6 }}
          >
            Mis XV años
          </motion.p>
          <motion.h1
            className="text-gold mt-1 px-[0.15em] py-[0.1em] font-script text-[clamp(4.2rem,22vw,10rem)] leading-[1.05]"
            initial={{ opacity: 0, y: 20, filter: "blur(12px)" }}
            animate={opened ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}}
            transition={{ duration: 1.6, ease, delay: 1.8 }}
          >
            {event.name}
          </motion.h1>
          {event.surname && <p className="font-serif text-xl uppercase tracking-[0.4em] text-silver">{event.surname}</p>}
          <motion.div
            className="mt-4 flex items-center gap-4 font-serif text-2xl tracking-[0.25em] text-silver"
            initial={{ opacity: 0 }}
            animate={opened ? { opacity: 1 } : {}}
            transition={{ duration: 1.2, delay: 2.3 }}
          >
            <span>{eventDate.day}</span>
            <span className="h-1 w-1 rotate-45 bg-champagne" />
            <span>{eventDate.monthNum}</span>
            <span className="h-1 w-1 rotate-45 bg-champagne" />
            <span>{eventDate.year}</span>
          </motion.div>

          <motion.a
            href="#mensaje"
            className="absolute bottom-6 flex flex-col items-center gap-2 text-champagne/70"
            initial={{ opacity: 0 }}
            animate={opened ? { opacity: 1 } : {}}
            transition={{ delay: 3 }}
            aria-label="Ver más"
          >
            <span className="font-sans text-[0.6rem] uppercase tracking-[0.35em]">Deslizá</span>
            <span className="flex h-9 w-5 justify-center rounded-full border border-champagne/50 pt-1.5">
              <span className="h-2 w-[2px] animate-float rounded bg-champagne" />
            </span>
          </motion.a>
        </section>

        {/* ── MENSAJE ─────────────────────────────────────────── */}
        <section id="mensaje" className="px-6 py-24">
          <Reveal className="mx-auto max-w-xl text-center">
            <Divider />
            <p className="mt-10 font-serif text-[clamp(1.5rem,6vw,2.1rem)] font-light italic leading-snug text-pearl/90">
              “{event.welcomeMessage}”
            </p>
            {event.quote && <p className="text-gold mt-8 font-script text-4xl">{event.quote}</p>}
          </Reveal>
        </section>

        {/* ── CUENTA REGRESIVA ───────────────────────────────── */}
        <section className="px-5 py-20">
          <SectionTitle eyebrow="La cuenta regresiva" title="Faltan" />
          <Reveal>
            <Countdown target={eventDate.timestamp} />
          </Reveal>
        </section>

        {/* ── DATOS DEL EVENTO ───────────────────────────────── */}
        <section className="px-5 py-20">
          <SectionTitle eyebrow="Te espero" title="La celebración" />
          <EventDetails />
        </section>

        {/* ── RSVP ───────────────────────────────────────────── */}
        <section id="confirmar" className="px-5 py-20">
          <SectionTitle eyebrow="RSVP" title="Confirmá tu asistencia" />
          <Reveal>
            <RsvpForm guest={guest} invalidCode={invalidCode} />
          </Reveal>
        </section>

        {/* ── CIERRE ─────────────────────────────────────────── */}
        <footer className="relative px-6 pb-28 pt-16 text-center">
          <Reveal>
            <div className="relative mx-auto max-w-md rounded-[2rem] px-6 py-14">
              <Corners />
              <p className="eyebrow">Gracias por ser parte</p>
              <p className="text-gold mt-4 font-script text-7xl">{event.name}</p>
              <p className="mt-2 font-serif text-lg italic text-silver">
                {eventDate.long} · {event.receptionTime}
              </p>
            </div>
          </Reveal>
        </footer>
      </main>
    </div>
  );
}
