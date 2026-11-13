import { event, mapsLink } from "@/config/event";
import { eventDate, googleCalendarUrl } from "@/lib/format";
import Reveal from "./Reveal";
import { Corners } from "./Ornaments";

function Icon({ d }: { d: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d9bc84" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

const icons = {
  calendar: "M4 6.5h16v13H4zM4 10h16M8 3.5v4M16 3.5v4",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  pin: "M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  dress: "M9 3l3 3 3-3M9 3 6.5 9l2.5 2-3 10h12l-3-10 2.5-2L15 3",
};

export default function EventDetails() {
  return (
    <div className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-2">
      {/* Fecha */}
      <Reveal className="sm:col-span-2">
        <div className="glass relative overflow-hidden rounded-3xl px-6 py-10 text-center">
          <Corners />
          <div className="flex justify-center"><Icon d={icons.calendar} /></div>
          <p className="eyebrow mt-4">{eventDate.weekday}</p>
          <div className="mt-3 flex items-center justify-center gap-5">
            <span className="font-serif text-2xl uppercase tracking-[0.2em] text-silver">{eventDate.month.slice(0, 3)}</span>
            <span className="text-gold font-serif text-7xl font-light leading-none">{eventDate.dayNumber}</span>
            <span className="font-serif text-2xl tracking-[0.2em] text-silver">{eventDate.year}</span>
          </div>
          <p className="mt-4 font-serif text-lg italic text-pearl/70">{eventDate.long}</p>
          <a href={googleCalendarUrl()} target="_blank" rel="noopener noreferrer" className="btn-ghost mt-7">
            Agendar
          </a>
        </div>
      </Reveal>

      {/* Horario */}
      <Reveal delay={0.05}>
        <div className="glass flex h-full flex-col items-center rounded-3xl px-6 py-9 text-center">
          <Icon d={icons.clock} />
          <p className="eyebrow mt-4">Recepción</p>
          <p className="text-gold mt-3 font-serif text-5xl font-light">{event.receptionTime}</p>
          {event.endTime && <p className="mt-2 font-sans text-sm text-silver-dim">Finaliza {event.endTime}</p>}
        </div>
      </Reveal>

      {/* Dress code */}
      <Reveal delay={0.1}>
        <div className="glass flex h-full flex-col items-center rounded-3xl px-6 py-9 text-center">
          <Icon d={icons.dress} />
          <p className="eyebrow mt-4">Código de vestimenta</p>
          <p className="text-gold mt-3 font-serif text-4xl">{event.dressCode.title}</p>
          <p className="mt-3 max-w-xs font-sans text-sm leading-relaxed text-pearl/60">{event.dressCode.detail}</p>
        </div>
      </Reveal>

      {/* Lugar */}
      <Reveal className="sm:col-span-2" delay={0.05}>
        <div className="glass relative overflow-hidden rounded-3xl px-6 py-10 text-center">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-champagne/10 blur-3xl" />
          <div className="flex justify-center"><Icon d={icons.pin} /></div>
          <p className="eyebrow mt-4">Salón</p>
          <p className="text-gold mt-3 font-serif text-4xl sm:text-5xl">{event.venue.name}</p>
          <p className="mx-auto mt-3 max-w-sm font-sans text-[0.95rem] leading-relaxed text-pearl/70">{event.venue.address}</p>
          <a href={mapsLink()} target="_blank" rel="noopener noreferrer" className="btn-gold mt-8">
            <span className="relative z-10 flex items-center gap-2.5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden><path d={icons.pin} /></svg>
              Cómo llegar
            </span>
          </a>
        </div>
      </Reveal>
    </div>
  );
}
