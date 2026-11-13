export type TimeLeft = { days: number; hours: number; minutes: number; seconds: number; done: boolean; totalMs: number };

/** Tiempo restante entre `now` y `target` (ambos en ms epoch). Función pura, testeada. */
export function getTimeLeft(target: number, now: number): TimeLeft {
  const totalMs = Math.max(0, target - now);
  const s = Math.floor(totalMs / 1000);
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
    done: totalMs === 0,
    totalMs,
  };
}
