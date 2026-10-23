import { addDays } from "date-fns";

import { toDateKey } from "@/lib/dates";

/** Escala del ánimo diario: 1 (muy bajo) a 10 (muy bien). */
export const MOOD_MIN = 1;
export const MOOD_MAX = 10;

export const MOOD_RANGES = [
  { key: "7", label: "Semana", days: 7 },
  { key: "30", label: "Mes", days: 30 },
  { key: "90", label: "3 meses", days: 90 },
] as const;
export type MoodRangeKey = (typeof MOOD_RANGES)[number]["key"];

export type MoodEntry = { logged_at: string; mood: number | null };
/** Un punto por día con registro: promedio del ánimo de ese día. */
export type MoodDay = { day: string; mood: number; count: number };

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Agrupa los registros con ánimo por día (zona horaria del consultorio) y promedia. Orden ascendente. */
export function dailyMood(entries: MoodEntry[], tz?: string): MoodDay[] {
  const byDay = new Map<string, { sum: number; count: number }>();
  for (const e of entries) {
    if (e.mood === null || e.mood === undefined) continue;
    const day = toDateKey(e.logged_at, tz);
    const acc = byDay.get(day) ?? { sum: 0, count: 0 };
    acc.sum += e.mood;
    acc.count += 1;
    byDay.set(day, acc);
  }
  return [...byDay.entries()]
    .map(([day, { sum, count }]) => ({ day, mood: round1(sum / count), count }))
    .sort((a, b) => a.day.localeCompare(b.day));
}

/** Días dentro de los últimos `days` días contando hoy. */
export function lastDays(days: MoodDay[], range: number, today: string): MoodDay[] {
  const from = toDateKey(addDays(new Date(`${today}T12:00:00Z`), -(range - 1)), "UTC");
  return days.filter((d) => d.day >= from && d.day <= today);
}

export function average(days: MoodDay[]): number | null {
  if (days.length === 0) return null;
  return round1(days.reduce((s, d) => s + d.mood, 0) / days.length);
}

/** Promedio de la semana actual (últimos 7 días) y de la anterior (8 a 14 días atrás). */
export function weekComparison(days: MoodDay[], today: string): { current: number | null; previous: number | null } {
  const current = lastDays(days, 7, today);
  const previous = lastDays(days, 14, today).filter((d) => !current.includes(d));
  return { current: average(current), previous: average(previous) };
}

/**
 * Recta de tendencia por mínimos cuadrados sobre los días (x = días desde el primero).
 * Devuelve los valores de la recta en cada día, o null si hay menos de 3 días.
 */
export function trendLine(days: MoodDay[]): number[] | null {
  if (days.length < 3) return null;
  const t0 = Date.parse(`${days[0]!.day}T00:00:00Z`);
  const xs = days.map((d) => (Date.parse(`${d.day}T00:00:00Z`) - t0) / 86_400_000);
  const ys = days.map((d) => d.mood);
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i]! - mx) * (ys[i]! - my);
    den += (xs[i]! - mx) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  return xs.map((x) => round1(Math.min(MOOD_MAX, Math.max(MOOD_MIN, my + slope * (x - mx)))));
}
