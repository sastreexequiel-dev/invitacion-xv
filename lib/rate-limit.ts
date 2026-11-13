import "server-only";

/**
 * Limitador simple en memoria (por instancia del servidor).
 * Frena abusos básicos del formulario; para tráfico muy alto conviene
 * un servicio externo (p. ej. Upstash), pero para una fiesta alcanza.
 */
const hits = new Map<string, number[]>();

export function rateLimit(key: string, limit = 12, windowMs = 10 * 60 * 1000): boolean {
  const now = Date.now();
  const list = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (list.length >= limit) {
    hits.set(key, list);
    return false;
  }
  list.push(now);
  hits.set(key, list);
  if (hits.size > 5000) hits.clear();
  return true;
}
