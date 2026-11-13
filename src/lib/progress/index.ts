import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

/**
 * Mi Progreso Terapéutico: lógica pura (sin base de datos) para poder probarla aislada.
 *
 * Principios clínicos:
 * - Se reconoce la práctica, nunca el contenido: un ánimo de 2 vale lo mismo que uno de 9.
 * - No hay rachas diarias que se rompan: se cuentan semanas con la meta cumplida, y nunca bajan.
 * - Topes para que practicar de más no sume: 5 actividades por día y una del mismo tipo cada 4 horas.
 * - Sin rankings ni comparaciones con otras personas.
 */

export type ActivityType = "registro" | "respiracion" | "tcc" | "act" | "dbt" | "ejercicio" | "movimiento" | "descanso" | "alimentacion";

export type PracticeEvent = { at: string; type: ActivityType };

export const ACTIVITY_LABEL: Record<ActivityType, string> = {
  registro: "Registro emocional",
  respiracion: "Respiración o atención plena",
  tcc: "Ejercicio de TCC",
  act: "Ejercicio de ACT",
  dbt: "Habilidad DBT",
  ejercicio: "Ejercicio",
  movimiento: "Hábito de movimiento",
  descanso: "Hábito de descanso",
  alimentacion: "Hábito de alimentación",
};

/** Puntos por tipo. Ejercicios de cuadernillo valen más porque llevan más tiempo. */
export const POINTS: Record<ActivityType, number> = { registro: 5, respiracion: 5, tcc: 10, act: 10, dbt: 10, ejercicio: 10, movimiento: 5, descanso: 5, alimentacion: 5 };
/** Hasta 5 prácticas por día (los hábitos cuentan una vez por pilar y por día). */
export const MAX_PER_DAY = 5;
export const SAME_TYPE_GAP_MS = 4 * 3600_000;

/** Tipo de actividad de una respuesta de ejercicio, según su plantilla. */
export function exerciseActivityType(kind: string, approach: string): ActivityType {
  if (kind === "breathing" || kind === "grounding" || kind === "mindful_pause") return "respiracion";
  if (approach === "tcc" || approach === "act" || approach === "dbt") return approach;
  if (kind === "thought_record") return "tcc";
  if (kind === "values" || kind === "committed_action" || kind === "defusion") return "act";
  if (kind === "dbt_skill") return "dbt";
  return "ejercicio";
}

/** Clave yyyy-MM-dd del día en la zona del consultorio. */
export const dayKey = (at: string | Date, tz: string) => formatInTimeZone(typeof at === "string" ? new Date(at) : at, tz, "yyyy-MM-dd");

/** Lunes (yyyy-MM-dd) de la semana de esa fecha, en la zona dada. */
export function weekKey(at: string | Date, tz: string): string {
  const key = dayKey(at, tz);
  const d = new Date(`${key}T12:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7; // 0 = lunes
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}

/**
 * Filtra las actividades que cuentan: como máximo 3 por día y una del mismo tipo cada 4 horas.
 * Devuelve las que cuentan, en orden cronológico.
 */
export function countedEvents(events: PracticeEvent[], tz: string): PracticeEvent[] {
  const sorted = [...events].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const perDay = new Map<string, number>();
  const lastOfType = new Map<ActivityType, number>();
  const out: PracticeEvent[] = [];
  for (const e of sorted) {
    const day = dayKey(e.at, tz);
    const t = Date.parse(e.at);
    if ((perDay.get(day) ?? 0) >= MAX_PER_DAY) continue;
    const last = lastOfType.get(e.type);
    if (last !== undefined && t - last < SAME_TYPE_GAP_MS) continue;
    perDay.set(day, (perDay.get(day) ?? 0) + 1);
    lastOfType.set(e.type, t);
    out.push(e);
  }
  return out;
}

export type BadgeKey = "primer-paso" | "una-semana" | "explorador-emocional" | "aprendiendo-a-observar" | "practicando-habilidades" | "compromiso" | "retomando" | "un-mes" | "en-movimiento" | "buen-descanso" | "comer-con-atencion" | "equilibrio";

export const BADGES: { key: BadgeKey; title: string; detail: string }[] = [
  { key: "primer-paso", title: "Primer paso", detail: "Hiciste tu primera práctica." },
  { key: "una-semana", title: "Una semana de práctica", detail: "Cumpliste tu meta de una semana." },
  { key: "explorador-emocional", title: "Explorador emocional", detail: "10 registros de cómo te sentías." },
  { key: "aprendiendo-a-observar", title: "Aprendiendo a observar", detail: "5 prácticas de respiración o atención plena." },
  { key: "practicando-habilidades", title: "Practicando habilidades", detail: "5 habilidades de DBT." },
  { key: "compromiso", title: "Compromiso con mi proceso", detail: "4 semanas con la meta cumplida." },
  { key: "retomando", title: "Retomando mi camino", detail: "Volviste a practicar después de un tiempo." },
  { key: "un-mes", title: "Un mes de aprendizaje", detail: "Un mes desde tu primera práctica, con 8 prácticas." },
  { key: "en-movimiento", title: "En movimiento", detail: "10 días con un hábito de movimiento." },
  { key: "buen-descanso", title: "Buen descanso", detail: "10 días con un hábito de descanso." },
  { key: "comer-con-atencion", title: "Comer con atención", detail: "10 días con un hábito de alimentación." },
  { key: "equilibrio", title: "Equilibrio", detail: "Una semana con movimiento, descanso y alimentación, al menos 3 días cada uno." },
];

const RETURN_GAP_MS = 10 * 24 * 3600_000;

export type ProgressSummary = {
  points: number;
  total: number;
  /** Actividades que cuentan esta semana (lunes a domingo). */
  thisWeek: number;
  weeklyGoal: number;
  /** Días de esta semana (lunes = 0) con alguna práctica. */
  daysThisWeek: boolean[];
  weeksMet: number;
  badges: BadgeKey[];
  byType: Record<ActivityType, number>;
  /** true si la última práctica fue hace más de 10 días (para un mensaje de bienvenida, nunca de reproche). */
  returning: boolean;
};

export function summarize(events: PracticeEvent[], opts: { weeklyGoal: number; tz: string; now?: Date }): ProgressSummary {
  const now = opts.now ?? new Date();
  const counted = countedEvents(events, opts.tz);
  const byType = { registro: 0, respiracion: 0, tcc: 0, act: 0, dbt: 0, ejercicio: 0, movimiento: 0, descanso: 0, alimentacion: 0 } as Record<ActivityType, number>;
  // Días por pilar de hábitos en cada semana (para la insignia «Equilibrio»).
  const pillarWeeks = new Map<string, { movimiento: Set<string>; descanso: Set<string>; alimentacion: Set<string> }>();
  const perWeek = new Map<string, number>();
  let points = 0;
  let returned = false;
  let prev: number | null = null;
  for (const e of counted) {
    byType[e.type] += 1;
    points += POINTS[e.type];
    const wk = weekKey(e.at, opts.tz);
    perWeek.set(wk, (perWeek.get(wk) ?? 0) + 1);
    if (e.type === "movimiento" || e.type === "descanso" || e.type === "alimentacion") {
      const w = pillarWeeks.get(wk) ?? { movimiento: new Set<string>(), descanso: new Set<string>(), alimentacion: new Set<string>() };
      w[e.type].add(dayKey(e.at, opts.tz));
      pillarWeeks.set(wk, w);
    }
    const t = Date.parse(e.at);
    if (prev !== null && t - prev >= RETURN_GAP_MS) returned = true;
    prev = t;
  }
  const currentWeek = weekKey(now, opts.tz);
  const weeksMet = [...perWeek.values()].filter((n) => n >= opts.weeklyGoal).length;
  const thisWeek = perWeek.get(currentWeek) ?? 0;

  const days = [false, false, false, false, false, false, false];
  for (const e of counted) {
    if (weekKey(e.at, opts.tz) !== currentWeek) continue;
    const d = new Date(`${dayKey(e.at, opts.tz)}T12:00:00Z`);
    days[(d.getUTCDay() + 6) % 7] = true;
  }

  const first = counted[0] ? Date.parse(counted[0].at) : null;
  const badges: BadgeKey[] = [];
  if (counted.length >= 1) badges.push("primer-paso");
  if (weeksMet >= 1) badges.push("una-semana");
  if (byType.registro >= 10) badges.push("explorador-emocional");
  if (byType.respiracion >= 5) badges.push("aprendiendo-a-observar");
  if (byType.dbt >= 5) badges.push("practicando-habilidades");
  if (weeksMet >= 4) badges.push("compromiso");
  if (returned) badges.push("retomando");
  if (first !== null && now.getTime() - first >= 30 * 24 * 3600_000 && counted.length >= 8) badges.push("un-mes");
  if (byType.movimiento >= 10) badges.push("en-movimiento");
  if (byType.descanso >= 10) badges.push("buen-descanso");
  if (byType.alimentacion >= 10) badges.push("comer-con-atencion");
  if ([...pillarWeeks.values()].some((w) => w.movimiento.size >= 3 && w.descanso.size >= 3 && w.alimentacion.size >= 3)) badges.push("equilibrio");

  return {
    points,
    total: counted.length,
    thisWeek,
    weeklyGoal: opts.weeklyGoal,
    daysThisWeek: days,
    weeksMet,
    badges,
    byType,
    returning: prev !== null && now.getTime() - prev >= RETURN_GAP_MS,
  };
}

/** Mensaje de la semana: siempre en positivo, sin culpa. */
export function weekMessage(s: Pick<ProgressSummary, "thisWeek" | "weeklyGoal" | "returning">): string {
  if (s.returning) return "Qué bueno verte de nuevo. Retomar también es parte del proceso.";
  if (s.thisWeek === 0) return "Una práctica breve ya cuenta. Cuando quieras, empezá por la de abajo.";
  if (s.thisWeek >= s.weeklyGoal) return `Cumpliste tu meta de la semana: ${s.thisWeek} ${s.thisWeek === 1 ? "práctica" : "prácticas"}.`;
  return `Completaste ${s.thisWeek} de tus ${s.weeklyGoal} actividades de esta semana. Cada práctica cuenta.`;
}

/* Desafíos ---------------------------------------------------------------- */

export type ChallengeDef = { key: string; title: string; detail: string; types: ActivityType[] };

export const CHALLENGES: ChallengeDef[] = [
  { key: "observacion-emocional", title: "Observación emocional", detail: "Registrar cómo te sentís, aunque sea en una línea.", types: ["registro"] },
  { key: "actividades-significativas", title: "Pequeñas actividades significativas", detail: "Un ejercicio de valores o activación por día.", types: ["act", "tcc"] },
  { key: "atencion-plena", title: "Atención plena", detail: "Una práctica de respiración o atención plena.", types: ["respiracion"] },
  { key: "identificar-pensamientos", title: "Identificar pensamientos", detail: "Un ejercicio de pensamientos (TCC).", types: ["tcc"] },
  { key: "habilidades-dbt", title: "Practicar habilidades", detail: "Una habilidad de DBT por día.", types: ["dbt"] },
  { key: "practica-libre", title: "Práctica libre", detail: "Cualquier ejercicio o registro.", types: ["registro", "respiracion", "tcc", "act", "dbt", "ejercicio", "movimiento", "descanso", "alimentacion"] },
  { key: "moverme", title: "Moverme más", detail: "Un hábito de movimiento por día.", types: ["movimiento"] },
  { key: "dormir-mejor", title: "Dormir mejor", detail: "Un hábito de descanso por día.", types: ["descanso"] },
  { key: "comer-regular", title: "Comer con regularidad", detail: "Un hábito de alimentación por día.", types: ["alimentacion"] },
];

export const challengeDef = (key: string) => CHALLENGES.find((c) => c.key === key);

export type ChallengeProgress = { done: number; target: number; days: number; endsOn: string; completed: boolean; ended: boolean };

/** Progreso de un desafío: días distintos con al menos una actividad del tipo pedido, dentro del plazo. */
export function challengeProgress(c: { challenge: string; days: number; target: number; starts_on: string }, events: PracticeEvent[], tz: string, now = new Date()): ChallengeProgress {
  const def = challengeDef(c.challenge);
  const start = fromZonedTime(`${c.starts_on}T00:00:00`, tz);
  const endDay = new Date(`${c.starts_on}T12:00:00Z`);
  endDay.setUTCDate(endDay.getUTCDate() + c.days - 1);
  const endsOn = endDay.toISOString().slice(0, 10);
  const end = fromZonedTime(`${endsOn}T23:59:59`, tz);
  const days = new Set<string>();
  for (const e of events) {
    const t = new Date(e.at);
    if (t < start || t > end) continue;
    if (def && !def.types.includes(e.type)) continue;
    days.add(dayKey(t, tz));
  }
  const done = Math.min(days.size, c.target);
  return { done, target: c.target, days: c.days, endsOn, completed: done >= c.target, ended: now > end };
}
