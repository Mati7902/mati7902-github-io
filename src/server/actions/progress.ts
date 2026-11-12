"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { assertAdmin, assertPatient } from "@/lib/auth/session";
import { toDateKey } from "@/lib/dates";
import { type ActionResult, fail, ok, validationFail } from "@/lib/errors";
import { challengeDef } from "@/lib/progress";
import { createClient } from "@/lib/supabase/server";
import { zodFieldErrors } from "@/lib/validation";
import { audit } from "@/server/services/audit";
import { getSetting } from "@/server/services/settings";

/* Paciente ------------------------------------------------------------------ */
const prefsSchema = z.object({
  weeklyGoal: z.number().int().min(1).max(7),
  pauseWeeks: z.number().int().min(0).max(4).optional(),
  resume: z.boolean().optional(),
  badgesEnabled: z.boolean(),
});

/** El paciente ajusta su meta semanal, pausa o reanuda, y elige ver o no las insignias. */
export async function updateProgressPrefsAction(input: z.infer<typeof prefsSchema>): Promise<ActionResult> {
  const parsed = prefsSchema.safeParse(input);
  if (!parsed.success) return validationFail(zodFieldErrors(parsed.error));
  try {
    const { patient } = await assertPatient();
    const supabase = await createClient();
    const { timezone } = await getSetting(supabase, "scheduling");
    const payload: { patient_id: string; weekly_goal: number; badges_enabled: boolean; paused_until?: string | null } = {
      patient_id: patient.id,
      weekly_goal: parsed.data.weeklyGoal,
      badges_enabled: parsed.data.badgesEnabled,
    };
    if (parsed.data.resume) payload.paused_until = null;
    else if (parsed.data.pauseWeeks) {
      const until = new Date(Date.now() + parsed.data.pauseWeeks * 7 * 24 * 3600_000);
      payload.paused_until = toDateKey(until, timezone);
    }
    const { error } = await supabase.from("progress_prefs").upsert(payload, { onConflict: "patient_id" });
    if (error) throw error;
    revalidatePath("/app");
    revalidatePath("/app/progreso");
    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}

/* Profesional --------------------------------------------------------------- */
const goalSchema = z.object({
  patientId: z.string().uuid(),
  id: z.string().uuid().optional(),
  title: z.string().trim().min(2, "Escribí el objetivo.").max(160),
  detail: z.string().trim().max(500).optional().nullable(),
  status: z.enum(["active", "achieved", "paused"]).default("active"),
});

export async function saveGoalAction(input: z.input<typeof goalSchema>): Promise<ActionResult> {
  const parsed = goalSchema.safeParse(input);
  if (!parsed.success) return validationFail(zodFieldErrors(parsed.error));
  try {
    const session = await assertAdmin();
    const supabase = await createClient();
    const { patientId, id, title, detail, status } = parsed.data;
    const row = { title, detail: detail || null, status, achieved_at: status === "achieved" ? new Date().toISOString() : null };
    const { error } = id
      ? await supabase.from("therapy_goals").update(row).eq("id", id).eq("patient_id", patientId)
      : await supabase.from("therapy_goals").insert({ ...row, patient_id: patientId, created_by: session.userId });
    if (error) throw error;
    await audit(supabase, "goal.saved", { type: "patient", id: patientId });
    revalidatePath(`/admin/pacientes/${patientId}`);
    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}

export async function deleteGoalAction(id: string, patientId: string): Promise<ActionResult> {
  try {
    await assertAdmin();
    const supabase = await createClient();
    const { error } = await supabase.from("therapy_goals").delete().eq("id", z.string().uuid().parse(id)).eq("patient_id", patientId);
    if (error) throw error;
    revalidatePath(`/admin/pacientes/${patientId}`);
    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}

const challengeSchema = z
  .object({
    patientId: z.string().uuid(),
    challenge: z.string().refine((k) => Boolean(challengeDef(k)), "Elegí un desafío."),
    days: z.union([z.literal(3), z.literal(7), z.literal(14), z.literal(30)]),
    target: z.number().int().min(1).max(30),
    note: z.string().trim().max(300).optional().nullable(),
  })
  .refine((c) => c.target <= c.days, { message: "La meta no puede superar los días del desafío.", path: ["target"] });

export async function assignChallengeAction(input: z.infer<typeof challengeSchema>): Promise<ActionResult> {
  const parsed = challengeSchema.safeParse(input);
  if (!parsed.success) return validationFail(zodFieldErrors(parsed.error));
  try {
    const session = await assertAdmin();
    const supabase = await createClient();
    const { timezone } = await getSetting(supabase, "scheduling");
    const { patientId, challenge, days, target, note } = parsed.data;
    const { error } = await supabase.from("progress_challenges").insert({ patient_id: patientId, challenge, days, target, note: note || null, starts_on: toDateKey(new Date(), timezone), created_by: session.userId });
    if (error) throw error;
    await audit(supabase, "challenge.assigned", { type: "patient", id: patientId }, { challenge, days });
    revalidatePath(`/admin/pacientes/${patientId}`);
    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}

export async function cancelChallengeAction(id: string, patientId: string): Promise<ActionResult> {
  try {
    await assertAdmin();
    const supabase = await createClient();
    const { error } = await supabase.from("progress_challenges").update({ status: "cancelled" }).eq("id", z.string().uuid().parse(id)).eq("patient_id", patientId);
    if (error) throw error;
    revalidatePath(`/admin/pacientes/${patientId}`);
    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}

/** Encender, apagar o volver a la regla por defecto (null) para un paciente. */
export async function setPatientProgressAction(patientId: string, enabled: boolean | null): Promise<ActionResult> {
  try {
    await assertAdmin();
    const supabase = await createClient();
    const id = z.string().uuid().parse(patientId);
    const { error } = await supabase.from("progress_prefs").upsert({ patient_id: id, professional_enabled: enabled }, { onConflict: "patient_id" });
    if (error) throw error;
    await audit(supabase, "progress.toggled", { type: "patient", id }, { enabled });
    revalidatePath(`/admin/pacientes/${id}`);
    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}
