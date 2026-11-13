import { addDays } from "date-fns";

import { formatInTimeZone } from "date-fns-tz";

/** Hoy y los 3 días anteriores (para marcar con atraso) y los días de esta semana, en la zona dada. */
export function habitDays(tz: string, now = new Date()): { days: { key: string; label: string }[]; weekDays: string[]; today: string } {
  const key = (d: Date) => formatInTimeZone(d, tz, "yyyy-MM-dd");
  const today = key(now);
  const labels = ["Hace 3 días", "Anteayer", "Ayer", "Hoy"];
  const days = [3, 2, 1, 0].map((n, i) => ({ key: key(addDays(now, -n)), label: labels[i]! }));
  const dow = (Number(formatInTimeZone(now, tz, "i")) + 6) % 7; // 0 = lunes
  const weekDays = Array.from({ length: dow + 1 }, (_, i) => key(addDays(now, -(dow - i))));
  return { days, weekDays, today };
}
