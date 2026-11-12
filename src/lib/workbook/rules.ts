import { bundleFor } from "@/lib/clinical/focus";
import { intakeQuestion, isPlainNegative, type IntakeAnswers } from "@/lib/intake/form";

/**
 * Motor de reglas del cuadernillo personalizado. Funciones puras: sin base de datos ni IA.
 *
 * Lee la ficha de ingreso y sugiere ejercicios que YA existen en la biblioteca. No diagnostica:
 * cada sugerencia guarda de qué respuesta salió, para que el profesional decida. Lo sensible
 * (autolesión, consumo, alimentación, hospitalizaciones) nunca se convierte en una actividad:
 * queda como alerta para revisar en sesión.
 *
 * Cambiar una regla → subir RULES_VERSION (queda registrada en cada borrador).
 */
export const RULES_VERSION = "2026-11-1";

export type WorkbookItem = {
  /** Slug de la plantilla de ejercicio (exercise_templates.slug). */
  slug: string;
  title: string;
  minutes: number | null;
  /** Nota del profesional que ve el paciente. */
  note: string | null;
  /** Días desde la publicación para tenerlo hecho (null = sin fecha). */
  dueInDays: number | null;
};

/** Capítulo redactado (psicoeducación y hojas de trabajo propias de este paciente). */
export type WorkbookChapter = {
  /** Identificador estable: las respuestas del paciente se guardan con él. */
  key: string;
  title: string;
  /** Párrafos separados por línea en blanco, viñetas con "- " y **negrita**. */
  body: string;
  /** Consignas para completar (en la app o a mano en el PDF). */
  prompts: WorkbookPrompt[];
};

export const PROMPT_TYPES = ["text", "vf", "scale", "choice", "checklist", "list"] as const;
export type PromptType = (typeof PROMPT_TYPES)[number];

export const PROMPT_TYPE_LABEL: Record<PromptType, string> = {
  text: "Pregunta abierta",
  vf: "Verdadero o falso",
  scale: "Escala",
  choice: "Opción múltiple (una)",
  checklist: "Marcar las que correspondan",
  list: "Lista (varios renglones)",
};

/**
 * Consigna de una hoja de trabajo. Según el tipo se usan distintos campos; los que no aplican
 * se ignoran. En V/F y opción múltiple, `correct` + `feedback` la convierten en una pregunta de
 * repaso: al responder, el paciente ve la explicación.
 */
export type WorkbookPrompt = {
  key: string;
  type?: PromptType;
  text: string;
  /** Pregunta abierta: renglones en el PDF. */
  lines?: number;
  /** Opción múltiple / marcar varias. */
  options?: string[];
  /** Escala. */
  min?: number;
  max?: number;
  minLabel?: string;
  maxLabel?: string;
  /** Lista: cuántos renglones. */
  count?: number;
  /** V/F: "v" | "f". Opción múltiple: el texto de la opción correcta. */
  correct?: string;
  feedback?: string;
};

/** Completa los valores por defecto y descarta lo que no aplica al tipo (también para datos viejos sin tipo). */
export function normalizePrompt(p: WorkbookPrompt): WorkbookPrompt & { type: PromptType } {
  const type: PromptType = p.type && (PROMPT_TYPES as readonly string[]).includes(p.type) ? p.type : "text";
  const base = { key: p.key, type, text: p.text };
  switch (type) {
    case "text":
      return { ...base, lines: Math.min(10, Math.max(1, p.lines ?? 3)) };
    case "vf":
      return { ...base, correct: p.correct === "v" || p.correct === "f" ? p.correct : undefined, feedback: p.feedback || undefined };
    case "scale": {
      const min = Math.min(1, Math.max(0, p.min ?? 0));
      const max = Math.min(10, Math.max(min + 2, p.max ?? 10));
      return { ...base, min, max, minLabel: p.minLabel || undefined, maxLabel: p.maxLabel || undefined };
    }
    case "choice":
    case "checklist": {
      const options = (p.options ?? []).map((o) => o.trim()).filter(Boolean).slice(0, 10);
      const correct = type === "choice" && p.correct && options.includes(p.correct) ? p.correct : undefined;
      return { ...base, options, correct, feedback: type === "choice" ? p.feedback || undefined : undefined };
    }
    case "list":
      return { ...base, count: Math.min(10, Math.max(1, p.count ?? 3)) };
  }
}


export type WorkbookContent = {
  welcome: string;
  /** Objetivos en palabras del paciente (de la ficha), editables. */
  goals: string[];
  /** Capítulos escritos para esta persona (cuadernillo redactado con IA y revisado por el profesional). */
  chapters?: WorkbookChapter[];
  items: WorkbookItem[];
  closing: string;
};

export type WorkbookSources = {
  /** Por slug: qué la originó (solo lo ve el profesional). */
  reasons: Record<string, string[]>;
  /** Para revisar en sesión. Nunca se muestra al paciente. */
  flags: string[];
  /** Sugerencias que no se pudieron incluir porque la plantilla no está cargada. */
  missing: string[];
};

type Rule = { id: string; label: string; when: (a: IntakeAnswers) => string[]; slugs: string[] };

/** true si la respuesta dice algo más que "no", "nada", "ninguno"… */
function said(a: IntakeAnswers, id: string): boolean {
  const v = a[id];
  if (typeof v !== "string") return false;
  const t = v.trim();
  return t.length > 0 && !isPlainNegative(t);
}

const label = (id: string) => {
  const q = intakeQuestion(id);
  return q && "label" in q ? String(q.label) : id;
};

/** Devuelve las preguntas (por etiqueta) que se respondieron con algo. */
const anyOf = (...ids: string[]) => (a: IntakeAnswers) => ids.filter((id) => said(a, id)).map(label);

const RULES: Rule[] = [
  { id: "ansiedad", label: "Ansiedad y activación", when: anyOf("ansiedad_irritabilidad", "pensamientos_acelerados", "sensaciones_estres"), slugs: ["cuadro-panico-entender", "respiracion-diafragmatica"] },
  {
    id: "animo",
    label: "Ánimo bajo",
    when: (a) => [...anyOf("anhedonia", "culpa_desesperanza")(a), ...(typeof a.estado_animo === "number" && a.estado_animo <= 4 ? [`${label("estado_animo")}: ${a.estado_animo}`] : [])],
    slugs: ["tcc-activacion-conductual", "cuadro-depresion-act-valores"],
  },
  { id: "pensamientos", label: "Pensamientos negativos y autocrítica", when: anyOf("pensamientos_negativos", "autocritica"), slugs: ["tcc-pensamientos-automaticos", "cuadro-autoestima-tcc-creencias"] },
  { id: "sueno", label: "Sueño", when: anyOf("sueno", "bio_sueno"), slugs: ["cuadro-sueno-entender", "cuadro-sueno-practica"] },
  { id: "regulacion", label: "Regulación emocional", when: anyOf("regulacion_emocional", "picos_emocionales", "impulsividad", "reaccion_enojo"), slugs: ["cuadro-regulacion-entender", "cuadro-regulacion-practica"] },
  { id: "evitacion", label: "Evitación", when: anyOf("evitacion"), slugs: ["cuadro-fobias-entender"] },
  { id: "obsesiones", label: "Ideas obsesivas", when: anyOf("ideas_obsesivas"), slugs: ["cuadro-toc-entender"] },
  { id: "trauma", label: "Recuerdos intrusivos o eventos difíciles", when: anyOf("recuerdos_intrusivos", "eventos_estresantes"), slugs: ["cuadro-trauma-entender"] },
  { id: "vinculos", label: "Vínculos y pareja", when: anyOf("conflictos_pareja", "confianza_limites"), slugs: ["cuadro-pareja-entender"] },
  { id: "atencion", label: "Atención", when: anyOf("atencion"), slugs: ["cuadro-tdah-entender"] },
];

/** Respuestas que no generan actividades: se revisan en sesión. */
const FLAGS: { ids: string[]; text: string }[] = [
  { ids: ["autolesion"], text: "Refiere antecedentes de autolesión o ideas suicidas: evaluar riesgo en sesión antes de asignar material." },
  { ids: ["hospitalizaciones"], text: "Refiere hospitalizaciones: revisar antecedentes." },
  { ids: ["conductas_alimentarias"], text: "Menciona conductas alimentarias: evaluar antes de asignar registros o metas." },
  { ids: ["alcohol", "cannabis", "estimulantes", "otras_sustancias", "bio_alcohol", "bio_otras_sustancias"], text: "Menciona consumo de sustancias: explorar en sesión." },
  { ids: ["medicacion", "bio_medicacion"], text: "Refiere medicación: tenerla en cuenta para ejercicios con activación física (TIPP, ejercicio intenso)." },
];

/** Siempre: cómo usar el cuadernillo. */
const BASE = ["tcc-antes-de-empezar"];
/** Menores de 18: los equivalentes del cuadernillo Brújula, escrito para adolescentes. */
const ADOLESCENT_SWAP: Record<string, string> = {
  "tcc-antes-de-empezar": "brujula-punto-de-partida",
  "tcc-activacion-conductual": "brujula-registro-actividad",
  "tcc-pensamientos-automaticos": "brujula-detector-de-pensamientos",
  "cuadro-depresion-act-valores": "brujula-lo-que-me-importa",
  "cuadro-regulacion-practica": "brujula-emocion-sube-a-100",
};
const MAX_ITEMS = 6;
const MAX_ITEMS_LOW_COMMITMENT = 3;

export type TemplateInfo = { slug: string; title: string; estimated_minutes: number | null };

/**
 * Arma el borrador. `templates` son las plantillas activas (para no sugerir algo que no existe);
 * `focusKeys` el diagnóstico probable que cargó el profesional, si lo hay.
 */
export function buildDraft(input: { answers: IntakeAnswers; firstName: string; professionalName: string; templates: TemplateInfo[]; focusKeys?: string[]; age?: number | null }): { content: WorkbookContent; sources: WorkbookSources } {
  const { answers } = input;
  const minor = typeof input.age === "number" && input.age < 18;
  const bySlug = new Map(input.templates.map((t) => [t.slug, t]));
  const reasons: Record<string, string[]> = {};
  const order: string[] = [];
  const add = (original: string, why: string) => {
    const slug = minor ? (ADOLESCENT_SWAP[original] ?? original) : original;
    if (!order.includes(slug)) order.push(slug);
    const list = (reasons[slug] ??= []);
    if (!list.includes(why)) list.push(why);
  };

  for (const slug of BASE) add(slug, "Base: cómo usar el cuadernillo");
  for (const slug of bundleFor(input.focusKeys ?? []).materials) add(slug, "Diagnóstico probable cargado por el profesional");
  for (const rule of RULES) {
    const hits = rule.when(answers);
    if (hits.length === 0) continue;
    for (const slug of rule.slugs) add(slug, `${rule.label} — ${hits.join(", ")}`);
  }

  const flags = FLAGS.filter((f) => f.ids.some((id) => said(answers, id))).map((f) => f.text);
  const lowCommitment = answers.compromiso === "Bajo";
  if (lowCommitment) flags.push("Compromiso declarado bajo: se sugieren pocas actividades breves.");
  if (!said(answers, "motivo")) flags.push("Sin motivo de consulta escrito: información insuficiente para personalizar.");

  const missing = order.filter((s) => !bySlug.has(s));
  const limit = lowCommitment ? MAX_ITEMS_LOW_COMMITMENT : MAX_ITEMS;
  const chosen = order.filter((s) => bySlug.has(s)).slice(0, limit);
  const leftOut = order.filter((s) => bySlug.has(s)).slice(limit);
  if (leftOut.length) flags.push(`Quedaron afuera por el límite de ${limit} actividades: ${leftOut.map((s) => bySlug.get(s)!.title).join(", ")}.`);

  const goalsText = typeof answers.objetivos === "string" ? answers.objetivos.trim() : "";
  const goals = goalsText
    ? goalsText
        .split(/\n+|(?<=\.)\s+/)
        .map((g) => g.trim().replace(/^[-•*\d.)\s]+/, ""))
        .filter((g) => g.length > 2)
        .slice(0, 5)
    : [];

  return {
    content: {
      welcome: `Hola, ${input.firstName}. Este cuadernillo lo armamos para acompañarte entre sesión y sesión. Hacé las actividades a tu ritmo: no hay respuestas correctas ni incorrectas, y lo que escribas nos ayuda a ver qué te sirve.`,
      goals,
      items: chosen.map((slug, i) => {
        const t = bySlug.get(slug)!;
        return { slug, title: t.title, minutes: t.estimated_minutes, note: null, dueInDays: (i + 1) * 3 };
      }),
      closing: `Traé tus dudas a la próxima sesión. Si en algún momento te sentís desbordado/a, usá «Calmarme» en la app. — ${input.professionalName}`,
    },
    sources: { reasons, flags, missing },
  };
}

/** Respuesta guardada → texto legible para el profesional. */
export function formatWorkbookAnswer(prompt: WorkbookPrompt, raw: string): string {
  const p = normalizePrompt(prompt);
  const list = () => {
    try {
      const x = JSON.parse(raw);
      return Array.isArray(x) ? x.map(String).filter((v) => v.trim()) : [raw];
    } catch {
      return [raw];
    }
  };
  switch (p.type) {
    case "vf": {
      const v = raw === "v" ? "Verdadero" : raw === "f" ? "Falso" : raw;
      return p.correct ? `${v} (${raw === p.correct ? "correcta" : "esperada: " + (p.correct === "v" ? "verdadero" : "falso")})` : v;
    }
    case "choice":
      return p.correct ? `${raw} (${raw === p.correct ? "correcta" : `esperada: ${p.correct}`})` : raw;
    case "scale":
      return `${raw} de ${p.max}`;
    case "checklist":
    case "list":
      return list().map((x) => `• ${x}`).join("\n") || "—";
    default:
      return raw;
  }
}
