/**
 * «Agregar a mi calendario». El título es neutro a propósito ("Turno"): los calendarios del
 * celular se comparten o se ven en la pantalla bloqueada, y la terapia es información sensible.
 */
export type CalendarEvent = { id: string; start: string; end: string; location?: string | null; url?: string | null; details?: string };

const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

export const EVENT_TITLE = "Turno";

export function buildIcs(e: CalendarEvent, now = new Date()): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Psicologia Matias Sanchez//Turnos//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${e.id}@matiassanchezpsicologo.com`,
    `DTSTAMP:${stamp(now.toISOString())}`,
    `DTSTART:${stamp(e.start)}`,
    `DTEND:${stamp(e.end)}`,
    `SUMMARY:${EVENT_TITLE}`,
    e.location ? `LOCATION:${esc(e.location)}` : null,
    e.details || e.url ? `DESCRIPTION:${esc([e.details, e.url].filter(Boolean).join("\n"))}` : null,
    e.url ? `URL:${e.url}` : null,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${EVENT_TITLE}`,
    "TRIGGER:-PT1H",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter((l): l is string => l !== null);
  return lines.join("\r\n") + "\r\n";
}

export function googleCalendarUrl(e: CalendarEvent): string {
  const p = new URLSearchParams({ action: "TEMPLATE", text: EVENT_TITLE, dates: `${stamp(e.start)}/${stamp(e.end)}` });
  if (e.location) p.set("location", e.location);
  const details = [e.details, e.url].filter(Boolean).join("\n");
  if (details) p.set("details", details);
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}
