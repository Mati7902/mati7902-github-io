"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { assertAdmin, assertPatient } from "@/lib/auth/session";
import { type ActionResult, fail, ok, validationFail } from "@/lib/errors";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { zodFieldErrors } from "@/lib/validation";
import { audit } from "@/server/services/audit";
import { applyClinicalFocus, assignTest, cancelTestAssignment, submitTestResponse } from "@/server/services/clinical";

const slug = z.string().regex(/^[a-z0-9-]{2,60}$/);

const applyFocusSchema = z.object({
  patientId: z.string().uuid(),
  focus: z.array(z.object({ key: z.string().regex(/^[a-z][a-z0-9_-]{1,40}$/), icd10: z.string().trim().max(20).optional().nullable(), note: z.string().trim().max(1000).optional().nullable() })).max(14),
  materials: z.array(slug).max(80),
  tests: z.array(z.string().regex(/^[a-z0-9]{2,20}$/)).max(20),
  showResults: z.boolean(),
});

/** Guarda el diagnóstico probable y habilita para el paciente los materiales y tests elegidos. */
export async function applyClinicalFocusAction(payload: z.infer<typeof applyFocusSchema>): Promise<ActionResult<{ materials: number; tests: number }>> {
  const parsed = applyFocusSchema.safeParse(payload);
  if (!parsed.success) return validationFail(zodFieldErrors(parsed.error));
  try {
    const session = await assertAdmin();
    const supabase = await createClient();
    const result = await applyClinicalFocus(supabase, { ...parsed.data, assignedBy: session.userId });
    // Sin el diagnóstico en la auditoría: solo cuántos recursos se habilitaron.
    await audit(supabase, "clinical_focus.applied", { type: "patient", id: parsed.data.patientId }, { materials: result.materials, tests: result.tests });
    revalidatePath(`/admin/pacientes/${parsed.data.patientId}`);
    return ok(result);
  } catch (error) {
    return fail(error);
  }
}

const assignTestSchema = z.object({
  patientId: z.string().uuid(),
  testId: z.string().regex(/^[a-z0-9]{2,20}$/),
  showResult: z.boolean(),
  dueOn: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]).optional().nullable(),
  note: z.string().trim().max(500).optional().nullable(),
});

export async function assignTestAction(payload: z.infer<typeof assignTestSchema>): Promise<ActionResult> {
  const parsed = assignTestSchema.safeParse(payload);
  if (!parsed.success) return validationFail(zodFieldErrors(parsed.error));
  try {
    const session = await assertAdmin();
    const supabase = await createClient();
    await assignTest(supabase, { ...parsed.data, assignedBy: session.userId });
    await audit(supabase, "test.assigned", { type: "patient", id: parsed.data.patientId }, { test_id: parsed.data.testId });
    revalidatePath(`/admin/pacientes/${parsed.data.patientId}`);
    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}

export async function cancelTestAction(assignmentId: string, patientId: string): Promise<ActionResult> {
  try {
    await assertAdmin();
    const supabase = await createClient();
    await cancelTestAssignment(supabase, z.string().uuid().parse(assignmentId));
    revalidatePath(`/admin/pacientes/${patientId}`);
    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}

const submitSchema = z.object({ assignmentId: z.string().uuid(), answers: z.record(z.string().regex(/^\d{1,2}$/), z.string().max(10)) });

/** El paciente envía un test asignado. El puntaje se calcula en el servidor. */
export async function submitTestAction(payload: z.infer<typeof submitSchema>): Promise<ActionResult<{ risk: boolean; showResult: boolean }>> {
  const parsed = submitSchema.safeParse(payload);
  if (!parsed.success) return validationFail(zodFieldErrors(parsed.error));
  try {
    const { patient } = await assertPatient();
    const result = await submitTestResponse(createAdminClient(), {
      assignmentId: parsed.data.assignmentId,
      patientId: patient.id,
      patientName: `${patient.first_name} ${patient.last_name}`.trim(),
      raw: parsed.data.answers,
    });
    revalidatePath("/app");
    revalidatePath("/app/tests");
    return ok(result);
  } catch (error) {
    return fail(error);
  }
}
