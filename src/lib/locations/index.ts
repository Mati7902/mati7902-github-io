import { ruleOccursOn } from "@/lib/scheduling/slots";
import type { PracticeLocation } from "@/types/domain";

type LocationLike = Pick<PracticeLocation, "name" | "address" | "city">;

/** Texto que se guarda en el turno y va en los recordatorios: "Sanatorio X — Dirección, Ciudad". */
export function locationLabel(l: LocationLike): string {
  return `${l.name} — ${[l.address, l.city].filter(Boolean).join(", ")}`;
}

/** Búsqueda para el mapa: nombre + ciudad encuentra mejor el lugar que la dirección sola. */
function mapsQuery(l: LocationLike): string {
  return [l.name, l.address, l.city].filter(Boolean).join(", ");
}

/** Enlace "Cómo llegar": el cargado a mano o una búsqueda en Google Maps. */
export function directionsUrl(l: LocationLike & { maps_url?: string | null }): string {
  return l.maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery(l))}`;
}

/** Mapa embebido (sin clave de API) para la portada. */
export function mapEmbedUrl(l: LocationLike): string {
  return `https://www.google.com/maps?q=${encodeURIComponent(mapsQuery(l))}&output=embed`;
}

const WEEKDAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const FREQUENCY: Record<number, string> = { 2: "cada 15 días", 3: "cada 3 semanas", 4: "una vez por mes" };

type RuleLike = { weekday: number; start_time: string; end_time: string; every_weeks?: number | null; anchor_date?: string | null; valid_from?: string | null; valid_until?: string | null; is_active?: boolean; location_id?: string | null };

/** "Martes de 16:00 a 20:00, cada 15 días". */
export function describeRule(r: RuleLike): string {
  const base = `${WEEKDAYS[r.weekday] ?? ""} de ${r.start_time.slice(0, 5)} a ${r.end_time.slice(0, 5)}`;
  const freq = FREQUENCY[r.every_weeks ?? 1];
  return freq ? `${base}, ${freq}` : base;
}

/** Próximas fechas (yyyy-MM-dd) en que ocurre la franja, desde `fromKey` inclusive. */
export function nextRuleDates(r: RuleLike, fromKey: string, count: number): string[] {
  const out: string[] = [];
  const day = new Date(`${fromKey}T00:00:00Z`);
  for (let i = 0; i < 120 && out.length < count; i++, day.setUTCDate(day.getUTCDate() + 1)) {
    const key = day.toISOString().slice(0, 10);
    if (day.getUTCDay() !== r.weekday) continue;
    if (r.is_active === false || (r.valid_from && key < r.valid_from) || (r.valid_until && key > r.valid_until)) continue;
    if (ruleOccursOn(r, key)) out.push(key);
  }
  return out;
}
