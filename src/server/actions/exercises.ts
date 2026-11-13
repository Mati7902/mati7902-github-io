"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { assertPatient } from "@/lib/auth/session";
import { type ActionResult, fail, ok, validationFail, AppError } from "@/lib/errors";
import { answersSchema } from "@/lib/exercises/steps";
import { createClient } from "@/lib/supabase/server";
import { zodFieldErrors } from "@/lib/validation";
import { deleteExerciseResponse, saveExerciseResponse } from "@/server/services/exercises";

const schema = z.object({
  templateId: z.string().uuid(),
  assignmentId: z.string().uuid().nullable().optional(),
  answers: answersSchema,
  emotionBefore: z.number().int().min(0).max(10).nullable().optional(),
  emotionAfter: z.number().int().min(0).max(10).nullable().optional(),
  durationSeconds: z.number().int().min(0).max(24 * 3600).nullable().optional(),
});

export type ExerciseResponsePayload = z.infer<typeof schema>;

export async function saveExerciseResponseAction(payload: ExerciseResponsePayload): Promise<ActionResult<{ id: string }>> {
  const parsed = schema.safeParse(payload);
  if (!parsed.success) return validationFail(zodFieldErrors(parsed.error), "No pudimos validar tus respuestas.");
  try {
    const { patient } = await assertPatient();
    const supabase = await createClient();
    const { data: template } = await supabase.from("exercise_templates").select("id, is_active").eq("id", parsed.data.templateId).maybeSingle();
    if (!template || !template.is_active) throw new AppError("NOT_FOUND", "Este ejercicio ya no está disponible.");
    const response = await saveExerciseResponse(supabase, {
      patientId: patient.id,
      templateId: parsed.data.templateId,
      assignmentId: parsed.data.assignmentId ?? null,
      answers: parsed.data.answers,
      emotionBefore: parsed.data.emotionBefore ?? null,
      emotionAfter: parsed.data.emotionAfter ?? null,
      durationSeconds: parsed.data.durationSeconds ?? null,
    });
    revalidatePath("/app/ejercicios");
    revalidatePath("/app");
    return ok({ id: response.id });
  } catch (error) {
    return fail(error);
  }
}

export async function deleteExerciseResponseAction(id: string): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(id).success) return fail(new AppError("VALIDATION", "Respuesta inválida."));
  try {
    const { patient } = await assertPatient();
    const supabase = await createClient();
    await deleteExerciseResponse(supabase, patient.id, id);
    revalidatePath("/app/ejercicios", "layout");
    revalidatePath("/app/calmarme");
    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}

/** «¿Te sirvió?» al terminar un ejercicio. Le sirve al profesional para ajustar lo que propone. */
export async function rateExerciseAction(input: { id: string; helpful: "si" | "algo" | "no" }): Promise<ActionResult> {
  const parsed = z.object({ id: z.string().uuid(), helpful: z.enum(["si", "algo", "no"]) }).safeParse(input);
  if (!parsed.success) return fail(new AppError("VALIDATION", "Respuesta inválida."));
  try {
    const { patient } = await assertPatient();
    const supabase = await createClient();
    const { error } = await supabase.from("exercise_responses").update({ helpful: parsed.data.helpful }).eq("id", parsed.data.id).eq("patient_id", patient.id);
    if (error) throw error;
    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}
