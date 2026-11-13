/**
 * Informe quincenal del profesional: quincenas 1–15 y 16–fin de mes, en la zona horaria del
 * consultorio. Este módulo es puro (sin base de datos) para poder probarlo.
 */
import { addDays } from "date-fns";

import { toDateKey } from "@/lib/dates";
import { habitById, type PillarKey } from "@/lib/habits/data";

export type Period = { start: string; end: string };

const pad = (n: number) => String(n).padStart(2, "0");
const lastDayOfMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/** La quincena que contiene el día dado (YYYY-MM-DD). */
export function periodContaining(day: string): Period {
  const [y = 0, m = 1, d = 1] = day.split("-").map(Number);
  const ym = `${y}-${pad(m)}`;
  return d <= 15 ? { start: `${ym}-01`, end: `${ym}-15` } : { start: `${ym}-16`, end: `${ym}-${pad(lastDayOfMonth(y, m))}` };
}

/** La quincena anterior a la que contiene el día dado. */
export function previousPeriod(day: string): Period {
  const start = periodContaining(day).start;
  const before = toDateKey(addDays(new Date(`${start}T12:00:00Z`), -1), "UTC");
  return periodContaining(before);
}

/** El informe automático sale el 1 y el 16 de cada mes. */
export const reportDueOn = (day: string) => day.endsWith("-01") || day.endsWith("-16");

export const inPeriod = (day: string, p: Period) => day >= p.start && day <= p.end;

export function periodLabel(p: Period): string {
  const fmt = (d: string) => new Intl.DateTimeFormat("es-PY", { day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));
  return `${fmt(p.start)} al ${fmt(p.end)} de ${p.end.slice(0, 4)}`;
}

// ---------------------------------------------------------------------------

export type ReportInput = {
  period: Period;
  /** La quincena anterior, para comparar el ánimo. */
  previous: Period;
  tz: string;
  now: Date;
  patients: { id: string; name: string; share: boolean }[];
  appointments: { patient_id: string; start_time: string; status: string }[];
  moods: { patient_id: string; logged_at: string; mood: number | null }[];
  exercises: { patient_id: string; completed_at: string }[];
  habits: { patient_id: string; habit_id: string; logged_on: string }[];
  tests: { patient_id: string; title: string; score: number | null; max_score: number | null; band_label: string | null; level: string | null; risk: boolean; completed_at: string }[];
  workbooks: { patient_id: string; status: string; prompts: number; answered: number; answeredInPeriod: number }[];
};

export type AlertLevel = "crit" | "warn" | "info";
export type ReportAlert = { level: AlertLevel; text: string };

export type PatientReport = {
  id: string;
  name: string;
  shared: boolean;
  sessions: { done: number; cancelled: number; noShow: number; next: string | null };
  /** null si el paciente no comparte sus registros. */
  mood: { avg: number | null; previous: number | null; logs: number } | null;
  practice: { exercises: number; habitDays: Record<PillarKey, number> } | null;
  tests: { title: string; score: number | null; max: number | null; band: string | null; level: string | null; risk: boolean; on: string }[];
  workbook: { status: string; prompts: number; answered: number; answeredInPeriod: number } | null;
  alerts: ReportAlert[];
};

export type BiweeklyReport = {
  version: 1;
  period: Period;
  /** Generado antes de terminar la quincena (con «Generar ahora»). */
  partial: boolean;
  totals: { patients: number; sessionsDone: number; cancelled: number; noShow: number; withAlerts: number; withRisk: number; withoutActivity: number };
  patients: PatientReport[];
};

const round1 = (n: number) => Math.round(n * 10) / 10;
const avg = (xs: number[]) => (xs.length ? round1(xs.reduce((a, b) => a + b, 0) / xs.length) : null);
const DONE = new Set(["completed"]);
const SCHEDULED = new Set(["pending", "confirmed", "rescheduled"]);
const LEVEL_ORDER: Record<AlertLevel, number> = { crit: 0, warn: 1, info: 2 };

export function buildBiweeklyReport(input: ReportInput): BiweeklyReport {
  const { period, previous, tz, now } = input;
  const nowIso = now.toISOString();
  const group = <T extends { patient_id: string }>(rows: T[]) => {
    const m = new Map<string, T[]>();
    for (const r of rows) (m.get(r.patient_id) ?? m.set(r.patient_id, []).get(r.patient_id)!).push(r);
    return m;
  };
  const appts = group(input.appointments);
  const moods = group(input.moods);
  const exercises = group(input.exercises);
  const habits = group(input.habits);
  const tests = group(input.tests);
  const workbooks = new Map(input.workbooks.map((w) => [w.patient_id, w]));

  const patients: PatientReport[] = input.patients.map((p) => {
    const alerts: ReportAlert[] = [];
    const own = appts.get(p.id) ?? [];
    const inP = own.filter((a) => inPeriod(toDateKey(a.start_time, tz), period));
    // Una sesión agendada que ya pasó y no se cerró cuenta como realizada (el cron marca las ausencias).
    const done = inP.filter((a) => DONE.has(a.status) || (SCHEDULED.has(a.status) && a.start_time < nowIso)).length;
    const cancelled = inP.filter((a) => a.status === "cancelled").length;
    const noShow = inP.filter((a) => a.status === "no_show").length;
    const next = own.filter((a) => SCHEDULED.has(a.status) && a.start_time >= nowIso).map((a) => a.start_time).sort()[0] ?? null;
    if (noShow >= 2) alerts.push({ level: "warn", text: `${noShow} ausencias sin aviso en la quincena.` });
    else if (noShow === 1) alerts.push({ level: "info", text: "Una ausencia sin aviso." });
    if (done === 0 && !next) alerts.push({ level: "warn", text: "Sin sesiones en la quincena ni turno agendado." });

    const testRows = (tests.get(p.id) ?? [])
      .filter((t) => inPeriod(toDateKey(t.completed_at, tz), period))
      .sort((a, b) => a.completed_at.localeCompare(b.completed_at))
      .map((t) => ({ title: t.title, score: t.score, max: t.max_score, band: t.band_label, level: t.level, risk: t.risk, on: toDateKey(t.completed_at, tz) }));
    for (const t of testRows) {
      if (t.risk) alerts.push({ level: "crit", text: `${t.title}: respuesta de riesgo. Revisar a la brevedad.` });
      else if (t.level === "crit") alerts.push({ level: "crit", text: `${t.title}: ${t.band ?? "resultado alto"}.` });
      else if (t.level === "warn") alerts.push({ level: "warn", text: `${t.title}: ${t.band ?? "resultado a revisar"}.` });
    }

    const wb = workbooks.get(p.id);
    const workbook = wb ? { status: wb.status, prompts: wb.prompts, answered: wb.answered, answeredInPeriod: wb.answeredInPeriod } : null;
    if (wb?.status === "draft") alerts.push({ level: "info", text: "Cuadernillo en borrador: falta revisarlo y publicarlo." });

    let mood: PatientReport["mood"] = null;
    let practice: PatientReport["practice"] = null;
    if (p.share) {
      const ownMoods = moods.get(p.id) ?? [];
      const cur = ownMoods.filter((m) => m.mood !== null && inPeriod(toDateKey(m.logged_at, tz), period)).map((m) => m.mood!);
      const prev = ownMoods.filter((m) => m.mood !== null && inPeriod(toDateKey(m.logged_at, tz), previous)).map((m) => m.mood!);
      const logs = ownMoods.filter((m) => inPeriod(toDateKey(m.logged_at, tz), period)).length;
      mood = { avg: avg(cur), previous: avg(prev), logs };
      if (mood.avg !== null && mood.previous !== null && mood.avg - mood.previous <= -1.5) {
        alerts.push({ level: "warn", text: `El ánimo bajó de ${mood.previous} a ${mood.avg} (de 10) respecto de la quincena anterior.` });
      } else if (mood.avg !== null && mood.avg <= 3 && cur.length >= 3) {
        alerts.push({ level: "warn", text: `Ánimo promedio bajo: ${mood.avg} de 10.` });
      }

      const ex = (exercises.get(p.id) ?? []).filter((e) => inPeriod(toDateKey(e.completed_at, tz), period)).length;
      const days: Record<PillarKey, Set<string>> = { movimiento: new Set(), descanso: new Set(), alimentacion: new Set() };
      for (const h of habits.get(p.id) ?? []) {
        if (!inPeriod(h.logged_on, period)) continue;
        const found = habitById(h.habit_id);
        if (found) days[found.pillar.key].add(h.logged_on);
      }
      practice = { exercises: ex, habitDays: { movimiento: days.movimiento.size, descanso: days.descanso.size, alimentacion: days.alimentacion.size } };
      const habitTotal = practice.habitDays.movimiento + practice.habitDays.descanso + practice.habitDays.alimentacion;
      if (logs === 0 && ex === 0 && habitTotal === 0 && testRows.length === 0 && (workbook?.answeredInPeriod ?? 0) === 0) {
        alerts.push({ level: "info", text: "Sin registros ni actividades en la app durante la quincena." });
      }
    }

    alerts.sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]);
    return { id: p.id, name: p.name, shared: p.share, sessions: { done, cancelled, noShow, next }, mood, practice, tests: testRows, workbook, alerts };
  });

  const worst = (r: PatientReport) => (r.alerts[0] ? LEVEL_ORDER[r.alerts[0].level] : 3);
  patients.sort((a, b) => worst(a) - worst(b) || a.name.localeCompare(b.name, "es"));

  return {
    version: 1,
    period,
    partial: toDateKey(now, tz) <= period.end,
    totals: {
      patients: patients.length,
      sessionsDone: patients.reduce((s, p) => s + p.sessions.done, 0),
      cancelled: patients.reduce((s, p) => s + p.sessions.cancelled, 0),
      noShow: patients.reduce((s, p) => s + p.sessions.noShow, 0),
      withAlerts: patients.filter((p) => p.alerts.some((a) => a.level !== "info")).length,
      withRisk: patients.filter((p) => p.alerts.some((a) => a.level === "crit")).length,
      withoutActivity: patients.filter((p) => p.alerts.some((a) => a.text.startsWith("Sin registros"))).length,
    },
    patients,
  };
}
