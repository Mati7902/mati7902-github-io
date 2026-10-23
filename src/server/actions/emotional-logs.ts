"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { assertPatient } from "@/lib/auth/session";
import { EMOTIONS } from "@/lib/config/site";
import { MOOD_MAX, MOOD_MIN } from "@/lib/mood";
import { type ActionResult, fail, ok, validationFail } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { zodFieldErrors } from "@/lib/validation";
import { createEmotionalLog, deleteEmotionalLog } from "@/server/services/emotional-logs";

const emotionKeys = EMOTIONS.map((e) => e.key) as [string, ...string[]];

// Un registro puede ser solo el ánimo (registro rápido) o emociones con su intensidad, o ambos.
const emotionalLogSchema = z
  .object({
    mood: z.number().int().min(MOOD_MIN).max(MOOD_MAX).optional().nullable(),
    emotions: z.array(z.enum(emotionKeys)).max(3, "Elegí hasta tres emociones."),
    intensity: z.number().int().min(0).max(10).optional().nullable(),
    situation: z.string().trim().max(1000).optional().nullable(),
    thought: z.string().trim().max(1000).optional().nullable(),
    behavior: z.string().trim().max(1000).optional().nullable(),
    need: z.string().trim().max(1000).optional().nullable(),
  })
  .refine((v) => v.emotions.length > 0 || (v.mood !== null && v.mood !== undefined), { message: "Elegí cómo está tu ánimo o al menos una emoción.", path: ["mood"] })
  .refine((v) => v.emotions.length === 0 || (v.intensity !== null && v.intensity !== undefined), { message: "Indicá la intensidad.", path: ["intensity"] });

export type EmotionalLogPayload = z.infer<typeof emotionalLogSchema>;

export async function saveEmotionalLogAction(payload: EmotionalLogPayload): Promise<ActionResult<{ id: string }>> {
  const parsed = emotionalLogSchema.safeParse(payload);
  if (!parsed.success) return validationFail(zodFieldErrors(parsed.error));
  try {
    const { patient } = await assertPatient();
    const supabase = await createClient();
    const log = await createEmotionalLog(supabase, patient.id, {
      emotions: parsed.data.emotions,
      intensity: parsed.data.emotions.length > 0 ? (parsed.data.intensity ?? null) : null,
      mood: parsed.data.mood ?? null,
      situation: parsed.data.situation || null,
      thought: parsed.data.thought || null,
      behavior: parsed.data.behavior || null,
      need: parsed.data.need || null,
    });
    revalidatePath("/app/registro");
    revalidatePath("/app");
    return ok({ id: log.id });
  } catch (error) {
    return fail(error);
  }
}

export async function deleteEmotionalLogAction(id: string): Promise<ActionResult> {
  try {
    const { patient } = await assertPatient();
    const supabase = await createClient();
    await deleteEmotionalLog(supabase, patient.id, id);
    revalidatePath("/app/registro");
    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}
