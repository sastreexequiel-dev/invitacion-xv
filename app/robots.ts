import type { MetadataRoute } from "next";

// Invitación privada: se pide a los buscadores que no la indexen.
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", disallow: "/" }] };
}
