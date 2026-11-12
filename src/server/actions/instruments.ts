"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { assertAdmin } from "@/lib/auth/session";
import { type ActionResult, fail, ok, validationFail } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { zodFieldErrors } from "@/lib/validation";
import { audit } from "@/server/services/audit";

const opt = (max: number) => z.string().trim().max(max).optional().nullable().transform((v) => v || null);
const num = z.union([z.number(), z.null()]).optional().transform((v) => (v === undefined ? null : v));

const instrumentSchema = z
  .object({
    id: z.string().uuid().optional(),
    name: z.string().trim().min(2, "Escribí el nombre.").max(120),
    short_name: z.string().trim().min(1, "Escribí la sigla.").max(30),
    edition: opt(120),
    rights_holder: opt(160),
    language: opt(60),
    license_scope: opt(500),
    digital_permission: z.boolean(),
    remote_permission: z.boolean(),
    license_expires_on: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]).optional().nullable().transform((v) => v || null),
    score_min: num,
    score_max: num,
    higher_is: z.enum(["worse", "better"]).nullable(),
    notes: opt(1000),
    is_active: z.boolean(),
  })
  .refine((v) => v.score_min === null || v.score_max === null || v.score_min < v.score_max, { message: "El mínimo tiene que ser menor que el máximo.", path: ["score_max"] });

/** Alta o edición de un instrumento con los datos de su licencia (sin ítems). */
export async function saveInstrumentAction(input: z.input<typeof instrumentSchema>): Promise<ActionResult> {
  const parsed = instrumentSchema.safeParse(input);
  if (!parsed.success) return validationFail(zodFieldErrors(parsed.error));
  try {
    const session = await assertAdmin();
    const supabase = await createClient();
    const { id, ...row } = parsed.data;
    const { error } = id ? await supabase.from("instruments").update(row).eq("id", id) : await supabase.from("instruments").insert({ ...row, created_by: session.userId });
    if (error) throw error;
    await audit(supabase, "instrument.saved", { type: "instrument", id: id ?? null });
    revalidatePath("/admin/instrumentos");
    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}

const resultSchema = z.object({
  patientId: z.string().uuid(),
  instrumentId: z.string().uuid({ message: "Elegí el instrumento." }),
  appliedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Elegí la fecha."),
  score: z.number().nullable(),
  interpretation: opt(200),
  notes: opt(1000),
});

/** Resultado de un instrumento aplicado por el canal autorizado (papel, plataforma del editor, entrevista). */
export async function addInstrumentResultAction(input: z.input<typeof resultSchema>): Promise<ActionResult> {
  const parsed = resultSchema.safeParse(input);
  if (!parsed.success) return validationFail(zodFieldErrors(parsed.error));
  try {
    const session = await assertAdmin();
    const supabase = await createClient();
    const { patientId, instrumentId, appliedOn, score, interpretation, notes } = parsed.data;
    const { error } = await supabase.from("instrument_results").insert({ patient_id: patientId, instrument_id: instrumentId, applied_on: appliedOn, score, interpretation, notes, created_by: session.userId });
    if (error) throw error;
    await audit(supabase, "instrument.result_added", { type: "patient", id: patientId });
    revalidatePath(`/admin/pacientes/${patientId}`);
    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}

export async function deleteInstrumentResultAction(id: string, patientId: string): Promise<ActionResult> {
  try {
    await assertAdmin();
    const supabase = await createClient();
    const { error } = await supabase.from("instrument_results").delete().eq("id", z.string().uuid().parse(id)).eq("patient_id", patientId);
    if (error) throw error;
    revalidatePath(`/admin/pacientes/${patientId}`);
    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}
