/**
 * ============================================================
 *  CONFIGURACIÓN CENTRAL DE LA INVITACIÓN
 * ============================================================
 *  Todo lo que aparece en la invitación se edita SOLO acá.
 *  No hace falta tocar ningún otro archivo del proyecto.
 *
 *  - Las imágenes y la música van en la carpeta /public.
 *  - La fecha usa formato ISO con zona horaria de Argentina (-03:00).
 * ============================================================
 */

export const event = {
  /** Nombre de la quinceañera (protagonista de la invitación) */
  name: "Valentina",

  /** Apellido u otra línea opcional bajo el nombre ("" para ocultar) */
  surname: "",

  /** Fecha y hora de inicio del evento (formato ISO, con zona horaria) */
  date: "2027-03-20T21:30:00-03:00",

  /** Zona horaria en la que se muestran fecha y hora */
  timeZone: "America/Argentina/Buenos_Aires",

  /** Texto del horario de recepción */
  receptionTime: "21:30 hs",

  /** Hora de finalización (opcional, "" para ocultar) */
  endTime: "05:00 hs",

  venue: {
    name: "Salón Lumière",
    address: "Av. del Libertador 1234, Buenos Aires, Argentina",
    /**
     * Enlace de Google Maps. Si lo dejás vacío ("") se genera
     * automáticamente a partir del nombre del salón + la dirección.
     */
    mapsUrl: "",
  },

  dressCode: {
    title: "Elegante",
    detail: "Sugerimos tonos oscuros, dorados o plateados. El blanco queda reservado para la quinceañera.",
  },

  /** Frase de la pantalla de bienvenida */
  welcomeTitle: "Estás invitado a mis 15 años",

  /** Mensaje principal dentro de la invitación */
  welcomeMessage:
    "Hay momentos que se esperan toda una vida. Esta noche quiero vivirla rodeada de las personas que más quiero. Me encantaría que seas parte.",

  /** Firma o frase corta debajo del mensaje (opcional) */
  quote: "Una noche para brillar.",

  /**
   * Música ambiental. Poné tu archivo .mp3 en /public/music/
   * y escribí la ruta acá. Se reproduce solo después de que el
   * invitado toca "ABRIR INVITACIÓN".
   */
  music: {
    src: "/music/ambient.mp3",
    volume: 0.55,
    title: "Música ambiental",
  },

  /**
   * Foto principal (opcional). Poné la imagen en /public/images/
   * y escribí la ruta, por ejemplo "/images/valentina.jpg".
   * Con "" se muestra el monograma dorado en su lugar.
   */
  heroImage: "",

  /** Imagen para la vista previa de WhatsApp (1200x630). "" = se genera sola. */
  shareImage: "",

  rsvp: {
    /** Fecha límite para confirmar (se muestra como texto) */
    deadline: "2027-03-01",
    /**
     * Acompañantes permitidos por defecto para invitaciones nuevas
     * creadas desde el panel (cada invitación puede tener su propio valor).
     */
    defaultMaxCompanions: 1,
    /** Máximo absoluto de acompañantes que se puede asignar a una invitación */
    maxCompanionsLimit: 10,
    /**
     * true  = cualquiera con el enlace general puede confirmar (se crea su registro).
     * false = solo pueden confirmar quienes tienen un enlace personal (?invitado=CODIGO).
     */
    allowOpenRsvp: true,
    /** Acompañantes permitidos para quien confirma desde el enlace general */
    openRsvpMaxCompanions: 1,
    /** Cupo total de invitados previsto (solo informativo en el panel) */
    expectedGuests: 150,
  },

  /** Textos para compartir por WhatsApp / redes (Open Graph) */
  share: {
    title: "Mis 15 · Valentina",
    description: "Estás invitado a una noche inolvidable. Abrí la invitación y confirmá tu asistencia ✨",
  },

  /** Mensaje que se muestra cuando llega el día del evento */
  eventDayMessage: "¡Hoy es la gran noche! Te espero para celebrar juntos.",
} as const;

export type EventConfig = typeof event;

export function mapsLink(): string {
  if (event.venue.mapsUrl) return event.venue.mapsUrl;
  const q = encodeURIComponent(`${event.venue.name}, ${event.venue.address}`);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}
