"use client";
import { useEffect, useRef } from "react";

type P = { x: number; y: number; r: number; vx: number; vy: number; a: number; tw: number; ph: number; kind: 0 | 1 | 2 };

/**
 * Partículas doradas en canvas: polvo dorado que asciende, destellos en
 * estrella y bokeh desenfocado. Ajusta la cantidad al tamaño de pantalla,
 * limita el devicePixelRatio y se pausa si la pestaña no está visible.
 */
export default function Particles({ density = 1, className = "" }: { density?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0, h = 0, raf = 0, running = true;
    let parts: P[] = [];

    // Sprites pre-renderizados (mucho más rápido que gradientes por frame)
    const makeSprite = (size: number, stops: [number, string][]) => {
      const c = document.createElement("canvas");
      c.width = c.height = size;
      const g = c.getContext("2d")!;
      const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      stops.forEach(([o, col]) => grd.addColorStop(o, col));
      g.fillStyle = grd;
      g.fillRect(0, 0, size, size);
      return c;
    };
    const dust = makeSprite(64, [[0, "rgba(255,246,220,1)"], [0.18, "rgba(243,220,166,.9)"], [0.45, "rgba(217,188,132,.25)"], [1, "rgba(217,188,132,0)"]]);
    const bokeh = makeSprite(128, [[0, "rgba(243,220,166,.20)"], [0.6, "rgba(217,188,132,.10)"], [0.85, "rgba(217,188,132,.05)"], [1, "rgba(217,188,132,0)"]]);

    const spawn = (initial: boolean): P => {
      const roll = Math.random();
      const kind: P["kind"] = roll < 0.08 ? 2 : roll < 0.2 ? 1 : 0;
      return {
        x: Math.random() * w,
        y: initial ? Math.random() * h : h + 20,
        r: kind === 2 ? 18 + Math.random() * 40 : kind === 1 ? 1.6 + Math.random() * 1.6 : 0.6 + Math.random() * 1.8,
        vx: (Math.random() - 0.5) * 0.12,
        vy: -(kind === 2 ? 0.05 + Math.random() * 0.1 : 0.12 + Math.random() * 0.38),
        a: kind === 2 ? 0.25 + Math.random() * 0.45 : 0.35 + Math.random() * 0.65,
        tw: 0.6 + Math.random() * 2.2,
        ph: Math.random() * Math.PI * 2,
        kind,
      };
    };

    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const target = Math.round(Math.min(140, Math.max(40, (w * h) / 9000)) * density * (reduced ? 0.35 : 1));
      parts = Array.from({ length: target }, () => spawn(true));
    };

    const star = (x: number, y: number, s: number, alpha: number) => {
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = "rgba(255,244,214,1)";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(x - s * 4, y); ctx.lineTo(x + s * 4, y);
      ctx.moveTo(x, y - s * 4); ctx.lineTo(x, y + s * 4);
      ctx.stroke();
      ctx.drawImage(dust, x - s * 3, y - s * 3, s * 6, s * 6);
    };

    let last = performance.now();
    const tick = (now: number) => {
      if (!running) return;
      const dt = Math.min(48, now - last) / 16.67;
      last = now;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      const t = now / 1000;
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        if (!reduced) {
          p.x += (p.vx + Math.sin(t * 0.4 + p.ph) * 0.08) * dt;
          p.y += p.vy * dt;
        }
        if (p.y < -60 || p.x < -60 || p.x > w + 60) parts[i] = spawn(false);
        const twinkle = 0.55 + 0.45 * Math.sin(t * p.tw + p.ph);
        if (p.kind === 2) {
          ctx.globalAlpha = p.a * (0.7 + 0.3 * twinkle);
          ctx.drawImage(bokeh, p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
        } else if (p.kind === 1) {
          star(p.x, p.y, p.r * (0.6 + 0.6 * twinkle), p.a * twinkle);
        } else {
          ctx.globalAlpha = p.a * twinkle;
          const s = p.r * 5;
          ctx.drawImage(dust, p.x - s / 2, p.y - s / 2, s, s);
        }
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(tick);
    };

    const onVis = () => {
      running = !document.hidden;
      if (running) { last = performance.now(); raf = requestAnimationFrame(tick); }
      else cancelAnimationFrame(raf);
    };

    resize();
    raf = requestAnimationFrame(tick);
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [density]);

  return <canvas ref={ref} aria-hidden className={`pointer-events-none h-full w-full ${className}`} />;
}
