import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";

import { getServerEnv } from "@/lib/env";
import { createLogger, errorMeta } from "@/lib/logger";
import { normalizePrompt, type WorkbookChapter } from "@/lib/workbook/rules";

const log = createLogger("ai.workbook");

export function isWorkbookAIConfigured(): boolean {
  return Boolean(getServerEnv().ANTHROPIC_API_KEY);
}

const OutputSchema = z.object({
  welcome: z.string(),
  goals: z.array(z.string()),
  chapters: z.array(
    z.object({
      title: z.string(),
      body: z.string(),
      prompts: z.array(
        z.object({
          type: z.enum(["text", "vf", "scale", "choice", "checklist", "list"]),
          text: z.string(),
          lines: z.number().int().nullable(),
          options: z.array(z.string()),
          min: z.number().int().nullable(),
          max: z.number().int().nullable(),
          min_label: z.string().nullable(),
          max_label: z.string().nullable(),
          count: z.number().int().nullable(),
          correct: z.string().nullable(),
          feedback: z.string().nullable(),
        }),
      ),
    }),
  ),
  library: z.array(z.string()),
  closing: z.string(),
  notes_for_professional: z.array(z.string()),
});

export type AIWorkbookDraft = {
  welcome: string;
  goals: string[];
  chapters: WorkbookChapter[];
  library: string[];
  closing: string;
  notes: string[];
};

const SYSTEM = `Sos un asistente de redacción para un psicólogo clínico de Paraguay que trabaja con TCC, ACT y DBT. Tu tarea es escribir el BORRADOR de un cuadernillo terapéutico personalizado a partir de la ficha de ingreso de un paciente. El profesional lo va a revisar, corregir y aprobar antes de que el paciente lo vea.

Cómo escribir:
- Español rioplatense con voseo ("vos", "sentís", "podés"), cálido, claro y sin tecnicismos innecesarios. Le hablás directamente al paciente.
- Psicoeducación basada en evidencia, adaptada a lo que la persona contó (motivo, síntomas, contexto, objetivos), sin copiar datos sensibles literalmente ni repetir relatos de hechos dolorosos.
- Entre 5 y 9 capítulos. Cada capítulo: un título breve, un cuerpo de 150 a 400 palabras (párrafos separados por una línea en blanco; viñetas empezando con "- "; **negrita** con doble asterisco) y una hoja de trabajo de 3 a 6 consignas que la persona completa en la app.
- Las consignas tienen que ser variadas y combinar tipos dentro de cada capítulo (no solo preguntas abiertas):
  - "vf": una afirmación para marcar verdadero o falso. Usalo para repasar la psicoeducación del capítulo: poné "correct" ("v" o "f") y un "feedback" de 1 o 2 oraciones que explique por qué.
  - "choice": opción múltiple con una sola respuesta, 3 o 4 "options". Para repasar, poné "correct" (copiando exactamente el texto de la opción) y "feedback". Para preferencias personales, dejá "correct" en null.
  - "checklist": marcar todas las que correspondan, 4 a 8 "options" (por ejemplo señales del cuerpo, situaciones, estrategias que ya probó).
  - "scale": autoevaluación con "min" 0 y "max" 10 (o 1 a 5), con "min_label" y "max_label" (ej.: "Nada" / "Muchísimo").
  - "list": enumerar varias cosas (ej.: "Tres situaciones en las que…"), con "count" de 2 a 6.
  - "text": pregunta abierta o ejercicio escrito (registro de pensamientos, carta, plan), con "lines" de 2 a 8.
  - Los campos que no aplican al tipo van en null (u "options" vacío).
- Al menos un capítulo debe ser un ejercicio práctico paso a paso (registro de pensamientos, plan de activación, valores, habilidad DBT, respiración o atención plena) armado con estas consignas.
- Un capítulo inicial de "Cómo usar este cuadernillo" no hace falta: ya está en la plantilla. Empezá por entender lo que le pasa (modelo cognitivo o el que corresponda) y seguí con habilidades prácticas.
- Si es menor de 18 años, escribí para un adolescente.

Límites (obligatorios):
- No diagnostiques ni nombres trastornos como conclusión. Podés hablar de "lo que contaste" o "lo que te pasa".
- No sugieras cambiar, empezar ni dejar medicación.
- No incluyas números de teléfono ni líneas de emergencia: la app ya tiene la sección "Calmarme" con los recursos verificados. Si la ficha muestra riesgo (autolesión, ideas de muerte), no lo trabajes en el cuadernillo: indicalo en notes_for_professional y mencioná en el cierre que ante un momento muy difícil use "Calmarme" y hable con su psicólogo.
- No propongas exposición, técnicas de trauma ni ejercicios físicos intensos sin indicar que se hacen acompañados por el profesional.
- "library": elegí de 0 a 5 slugs SOLO de la lista de ejercicios disponibles que te paso, los más útiles para esta persona. No inventes slugs.
- "goals": de 1 a 5 objetivos en primera persona y en palabras simples, a partir de lo que la persona dijo querer lograr.
- "notes_for_professional": lo que el profesional debería revisar (riesgo, información contradictoria o insuficiente, cosas que convendría evaluar en sesión). Solo lo ve el profesional.
- "welcome": 2 a 4 oraciones. "closing": 2 a 3 oraciones.`;

/**
 * Pide a Claude el borrador del cuadernillo. Devuelve null si no hay clave, si el modelo declina
 * o si la respuesta no se pudo leer: en esos casos se usa el borrador por reglas.
 */
export async function writeWorkbookWithAI(input: {
  age: number | null;
  intakeLines: string[];
  focusLabels: string[];
  library: { slug: string; title: string; description: string | null }[];
}): Promise<AIWorkbookDraft | null> {
  const env = getServerEnv();
  if (!env.ANTHROPIC_API_KEY) return null;
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, timeout: 280_000, maxRetries: 1 });

  const user = [
    `Edad: ${input.age ?? "sin dato"}`,
    input.focusLabels.length ? `Foco clínico cargado por el profesional (orientativo, no lo menciones como diagnóstico): ${input.focusLabels.join(", ")}` : "",
    "",
    "Ficha de ingreso (sin datos identificatorios):",
    ...input.intakeLines,
    "",
    "Ejercicios disponibles en la biblioteca (slug — título — descripción):",
    ...input.library.map((t) => `${t.slug} — ${t.title}${t.description ? ` — ${t.description.slice(0, 160)}` : ""}`),
  ]
    .filter((l) => l !== "")
    .join("\n");

  try {
    const response = await client.beta.messages.parse({
      model: env.WORKBOOK_AI_MODEL,
      max_tokens: 28000,
      betas: ["server-side-fallback-2026-07-01"],
      // Si el modelo declina por política, la API reintenta en el modelo de respaldo que corresponda.
      fallbacks: "default",
      output_config: { effort: "high", format: betaZodOutputFormat(OutputSchema) },
      system: SYSTEM,
      messages: [{ role: "user", content: user }],
    });
    if (response.stop_reason === "refusal") {
      log.warn("La IA declinó redactar el cuadernillo", { category: response.stop_details?.category ?? null });
      return null;
    }
    if (response.stop_reason === "max_tokens") log.warn("Cuadernillo con IA cortado por max_tokens");
    const out = response.parsed_output;
    if (!out) return null;
    const slugs = new Set(input.library.map((t) => t.slug));
    return {
      welcome: out.welcome.trim().slice(0, 1500),
      goals: out.goals.map((g) => g.trim()).filter(Boolean).slice(0, 5),
      chapters: out.chapters.slice(0, 10).map((c, i) => ({
        key: `c${i + 1}`,
        title: c.title.trim().slice(0, 140),
        body: c.body.trim().slice(0, 6000),
        prompts: c.prompts.slice(0, 8).map((p, j) =>
          normalizePrompt({
            key: `c${i + 1}p${j + 1}`,
            type: p.type,
            text: p.text.trim().slice(0, 400),
            lines: p.lines ?? undefined,
            options: p.options.map((o) => o.slice(0, 160)),
            min: p.min ?? undefined,
            max: p.max ?? undefined,
            minLabel: p.min_label?.slice(0, 40) || undefined,
            maxLabel: p.max_label?.slice(0, 40) || undefined,
            count: p.count ?? undefined,
            correct: p.correct ?? undefined,
            feedback: p.feedback?.slice(0, 600) || undefined,
          }),
        ),
      })),
      library: out.library.filter((s) => slugs.has(s)).slice(0, 5),
      closing: out.closing.trim().slice(0, 800),
      notes: out.notes_for_professional.map((n) => n.trim()).filter(Boolean).slice(0, 10),
    };
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) log.warn("Claude API: límite de uso", errorMeta(error));
    else if (error instanceof Anthropic.AuthenticationError) log.error("Claude API: clave inválida", errorMeta(error));
    else if (error instanceof Anthropic.APIError) log.error(`Claude API: error ${error.status}`, errorMeta(error));
    else log.error("No se pudo redactar el cuadernillo con IA", errorMeta(error));
    return null;
  }
}
