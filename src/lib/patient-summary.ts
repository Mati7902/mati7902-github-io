/**
 * Resumen individual del paciente para el profesional: qué hizo, qué tiene pendiente e
 * indicadores. Puro (sin base de datos) para poder probarlo.
 */
export type TaskKind = "ejercicio" | "material" | "test" | "cuadernillo";
export type SummaryTask = { kind: TaskKind; title: string; at: string; overdue?: boolean };

export type SummaryInput = {
  now: Date;
  exercises: { title: string; assigned_at: string; due_at: string | null; completed_at: string | null }[];
  materials: { title: string; assigned_at: string; viewed_at: string | null; completed_at: string | null }[];
  tests: { name: string; status: string; assigned_at: string; due_on: string | null; completed_at: string | null }[];
  workbook: { answered: number; prompts: number; lastAnswerAt: string | null } | null;
  appointments: { start_time: string; status: string }[];
  lastSeenAt: string | null;
  /** null si el paciente no comparte sus registros. */
  shared: { moodDays: { day: string; mood: number }[]; lastPracticeAt: string | null } | null;
};

export type PatientSummary = {
  done: SummaryTask[];
  pending: SummaryTask[];
  adherence: number | null;
  sessions: { attended: number; missed: number; cancelled: number; attendance: number | null };
  mood: { recent: number | null; previous: number | null } | null;
  lastActivityAt: string | null;
  daysSinceActivity: number | null;
  flags: string[];
};

const DAY = 86_400_000;
const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null);
const latest = (xs: (string | null)[]) => xs.filter((x): x is string => Boolean(x)).sort().at(-1) ?? null;

export function summarizePatient(i: SummaryInput): PatientSummary {
  const now = i.now.getTime();
  const nowIso = i.now.toISOString();
  const since30 = new Date(now - 30 * DAY).toISOString();
  const today = nowIso.slice(0, 10);
  const done: SummaryTask[] = [];
  const pending: SummaryTask[] = [];

  for (const e of i.exercises) {
    if (e.completed_at) done.push({ kind: "ejercicio", title: e.title, at: e.completed_at });
    else pending.push({ kind: "ejercicio", title: e.title, at: e.assigned_at, overdue: Boolean(e.due_at && e.due_at < nowIso) });
  }
  for (const m of i.materials) {
    if (m.completed_at || m.viewed_at) done.push({ kind: "material", title: m.title, at: (m.completed_at ?? m.viewed_at)! });
    else pending.push({ kind: "material", title: m.title, at: m.assigned_at });
  }
  for (const t of i.tests) {
    if (t.status === "cancelled") continue;
    if (t.status === "completed") done.push({ kind: "test", title: t.name, at: t.completed_at ?? t.assigned_at });
    else pending.push({ kind: "test", title: t.name, at: t.assigned_at, overdue: Boolean(t.due_on && t.due_on < today) });
  }
  if (i.workbook && i.workbook.prompts > 0) {
    if (i.workbook.answered >= i.workbook.prompts) done.push({ kind: "cuadernillo", title: "Cuadernillo completo", at: i.workbook.lastAnswerAt ?? nowIso });
    else pending.push({ kind: "cuadernillo", title: `Cuadernillo: ${i.workbook.answered} de ${i.workbook.prompts} consignas`, at: i.workbook.lastAnswerAt ?? nowIso });
  }
  done.sort((a, b) => b.at.localeCompare(a.at));
  pending.sort((a, b) => Number(Boolean(b.overdue)) - Number(Boolean(a.overdue)) || a.at.localeCompare(b.at));

  // Adherencia: de lo asignado (ejercicios, materiales, tests), cuánto ya hizo.
  const assigned = done.filter((d) => d.kind !== "cuadernillo").length + pending.filter((p) => p.kind !== "cuadernillo").length;
  const adherence = assigned ? Math.round((done.filter((d) => d.kind !== "cuadernillo").length / assigned) * 100) : null;

  const since90 = new Date(now - 90 * DAY).toISOString();
  const past = i.appointments.filter((a) => a.start_time >= since90 && a.start_time < nowIso);
  const attended = past.filter((a) => a.status === "completed" || a.status === "confirmed").length;
  const missed = past.filter((a) => a.status === "no_show").length;
  const cancelled = past.filter((a) => a.status === "cancelled").length;
  const attendance = attended + missed ? Math.round((attended / (attended + missed)) * 100) : null;

  let mood: PatientSummary["mood"] = null;
  if (i.shared) {
    const d14 = new Date(now - 14 * DAY).toISOString().slice(0, 10);
    const d28 = new Date(now - 28 * DAY).toISOString().slice(0, 10);
    mood = {
      recent: avg(i.shared.moodDays.filter((d) => d.day > d14).map((d) => d.mood)),
      previous: avg(i.shared.moodDays.filter((d) => d.day > d28 && d.day <= d14).map((d) => d.mood)),
    };
  }

  const lastActivityAt = latest([i.lastSeenAt, i.shared?.lastPracticeAt ?? null, i.workbook?.lastAnswerAt ?? null, ...done.filter((d) => d.kind !== "cuadernillo").map((d) => d.at)]);
  const daysSinceActivity = lastActivityAt ? Math.floor((now - new Date(lastActivityAt).getTime()) / DAY) : null;

  const flags: string[] = [];
  const overdue = pending.filter((p) => p.overdue).length;
  if (overdue) flags.push(`${overdue} ${overdue === 1 ? "tarea vencida" : "tareas vencidas"}`);
  if (daysSinceActivity === null) flags.push("Nunca entró a la app");
  else if (daysSinceActivity >= 14) flags.push(`Sin actividad hace ${daysSinceActivity} días`);
  if (missed >= 2) flags.push(`${missed} ausencias en 90 días`);
  if (mood?.recent != null && mood.previous != null && mood.recent - mood.previous <= -1.5) flags.push(`Ánimo en baja: ${mood.previous} → ${mood.recent}`);

  return { done: done.filter((d) => d.at >= since30), pending, adherence, sessions: { attended, missed, cancelled, attendance }, mood, lastActivityAt, daysSinceActivity, flags };
}
