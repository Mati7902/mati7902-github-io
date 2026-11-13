/**
 * Recordatorios suaves que el paciente elige. Lógica pura (sin base de datos) para poder probarla.
 * El tono es de invitación, nunca de reproche: si ya lo hizo hoy, no se le recuerda.
 */
export type ReminderPrefs = { mood: boolean; habits: boolean; workbook: boolean; hour: number; days: number[]; last_sent_on: string | null };

/** Hora (0–23) y día ISO (1 = lunes … 7 = domingo) en la zona horaria del consultorio. */
export function localClock(now: Date, tz: string): { hour: number; weekday: number; day: string } {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: tz, hour: "numeric", hour12: false, weekday: "short", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return { hour: Number(get("hour")) % 24, weekday: weekdays.indexOf(get("weekday")) + 1, day: `${get("year")}-${get("month")}-${get("day")}` };
}

export function nudgeDue(p: ReminderPrefs, clock: { hour: number; weekday: number; day: string }): boolean {
  if (!p.mood && !p.habits && !p.workbook) return false;
  if (p.last_sent_on === clock.day) return false;
  return p.hour === clock.hour && p.days.includes(clock.weekday);
}

export type NudgeState = { moodToday: boolean; habitToday: boolean; hasWorkbook: boolean };

/** El texto del recordatorio, o null si no hay nada para recordar hoy. */
export function nudgeMessage(p: ReminderPrefs, s: NudgeState): { title: string; body: string; url: string } | null {
  const items: { label: string; url: string }[] = [];
  if (p.mood && !s.moodToday) items.push({ label: "registrar cómo estás", url: "/app" });
  if (p.habits && !s.habitToday) items.push({ label: "marcar tus hábitos", url: "/app/habitos" });
  if (p.workbook && s.hasWorkbook) items.push({ label: "seguir con tu cuadernillo", url: "/app/cuadernillo" });
  const first = items[0];
  if (!first) return null;
  const list = items.length === 1 ? first.label : `${items.slice(0, -1).map((i) => i.label).join(", ")} o ${items[items.length - 1]!.label}`;
  return { title: "Un momento para vos", body: `Si te queda bien, podés ${list}. Lleva un minuto.`, url: first.url };
}
