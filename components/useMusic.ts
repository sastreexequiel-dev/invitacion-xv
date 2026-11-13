"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { event } from "@/config/event";

/**
 * Música ambiental. El <audio> se crea y se reproduce dentro del clic
 * del usuario (requisito de Chrome, Safari/iOS y el navegador de WhatsApp).
 * Si el navegador lo bloquea igual, queda en pausa y el botón permite activarla.
 */
export function useMusic() {
  const audio = useRef<HTMLAudioElement | null>(null);
  const fade = useRef<number>(0);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [blocked, setBlocked] = useState(false);

  const ensure = useCallback(() => {
    if (!audio.current) {
      const a = new Audio(event.music.src);
      a.loop = true;
      a.preload = "auto";
      a.volume = 0;
      a.setAttribute("playsinline", "");
      a.addEventListener("play", () => setPlaying(true));
      a.addEventListener("pause", () => setPlaying(false));
      a.addEventListener("canplay", () => setReady(true));
      audio.current = a;
    }
    return audio.current;
  }, []);

  const fadeTo = (a: HTMLAudioElement, target: number, ms: number, done?: () => void) => {
    cancelAnimationFrame(fade.current);
    const from = a.volume, start = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / ms);
      try { a.volume = from + (target - from) * k; } catch { /* iOS: volumen solo lectura */ }
      if (k < 1) fade.current = requestAnimationFrame(step);
      else done?.();
    };
    fade.current = requestAnimationFrame(step);
  };

  const play = useCallback(async () => {
    const a = ensure();
    try {
      await a.play();
      setBlocked(false);
      fadeTo(a, event.music.volume, 2500);
    } catch {
      setBlocked(true);
    }
  }, [ensure]);

  const pause = useCallback(() => {
    const a = audio.current;
    if (!a) return;
    fadeTo(a, 0, 500, () => a.pause());
  }, []);

  const toggle = useCallback(() => (playing ? pause() : play()), [playing, pause, play]);

  // Pausa al salir de la pestaña / app y no retoma sola
  useEffect(() => {
    const onHide = () => { if (document.hidden && audio.current && !audio.current.paused) audio.current.pause(); };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      audio.current?.pause();
    };
  }, []);

  return { playing, ready, blocked, play, pause, toggle };
}
