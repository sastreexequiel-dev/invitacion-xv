import { event } from "@/config/event";

const target = new Date(event.date);

const fmt = (opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("es-AR", { timeZone: event.timeZone, ...opts }).format(target);

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const eventDate = {
  timestamp: target.getTime(),
  weekday: cap(fmt({ weekday: "long" })),
  day: fmt({ day: "2-digit" }),
  dayNumber: fmt({ day: "numeric" }),
  month: cap(fmt({ month: "long" })),
  monthNum: fmt({ month: "2-digit" }),
  year: fmt({ year: "numeric" }),
  /** "Sábado 20 de marzo de 2027" */
  long: cap(fmt({ weekday: "long", day: "numeric", month: "long", year: "numeric" })),
};

export function formatDeadline(): string {
  const d = new Date(`${event.rsvp.deadline}T12:00:00-03:00`);
  return new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long", timeZone: event.timeZone }).format(d);
}

/** Enlace para agregar el evento a Google Calendar */
export function googleCalendarUrl(): string {
  const start = target;
  const end = new Date(start.getTime() + 7 * 3600 * 1000);
  const z = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: `XV de ${event.name}`,
    dates: `${z(start)}/${z(end)}`,
    location: `${event.venue.name}, ${event.venue.address}`,
    details: event.share.description,
  });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}
