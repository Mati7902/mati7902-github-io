"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { assertAdmin } from "@/lib/auth/session";
import { type ActionResult, fail, ok, validationFail } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { zodFieldErrors } from "@/lib/validation";
import { audit } from "@/server/services/audit";
import { getSetting } from "@/server/services/settings";
import { generateDraft, publishWorkbook, saveWorkbookVersion } from "@/server/services/workbooks";

const itemSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]{2,80}$/),
  title: z.string().trim().min(1).max(160),
  minutes: z.number().int().min(1).max(240).nullable(),
  note: z.string().trim().max(500).nullable(),
  dueInDays: z.number().int().min(1).max(90).nullable(),
});
const chapterSchema = z.object({
  key: z.string().regex(/^c[0-9]{1,2}$/),
  title: z.string().trim().min(1).max(140),
  body: z.string().trim().max(6000),
  prompts: z.array(z.object({ key: z.string().regex(/^c[0-9]{1,2}p[0-9]{1,2}$/), text: z.string().trim().min(1).max(400), lines: z.number().int().min(1).max(10) })).max(6),
});
const contentSchema = z.object({
  welcome: z.string().trim().max(1500),
  chapters: z.array(chapterSchema).max(12).optional(),
  goals: z.array(z.string().trim().min(1).max(200)).max(8),
  items: z.array(itemSchema).max(15),
  closing: z.string().trim().max(800),
});

export async function generateWorkbookDraftAction(patientId: string, opts: { useAI?: boolean } = {}): Promise<ActionResult<{ version: number; usedAI: boolean }>> {
  try {
    const session = await assertAdmin();
    const id = z.string().uuid().parse(patientId);
    const { version, usedAI } = await generateDraft(id, session.userId, { useAI: opts.useAI });
    const supabase = await createClient();
    await audit(supabase, "workbook.draft_generated", { type: "patient", id }, { version, ai: usedAI });
    revalidatePath(`/admin/pacientes/${id}/cuadernillo`);
    return ok({ version, usedAI });
  } catch (error) {
    return fail(error);
  }
}

export async function saveWorkbookAction(input: { patientId: string; workbookId: string; content: z.input<typeof contentSchema> }): Promise<ActionResult<{ version: number }>> {
  const parsed = contentSchema.safeParse(input.content);
  if (!parsed.success) return validationFail(zodFieldErrors(parsed.error));
  try {
    const session = await assertAdmin();
    const supabase = await createClient();
    const version = await saveWorkbookVersion(supabase, z.string().uuid().parse(input.workbookId), parsed.data, session.userId);
    await audit(supabase, "workbook.saved", { type: "patient", id: input.patientId }, { version });
    revalidatePath(`/admin/pacientes/${input.patientId}/cuadernillo`);
    return ok({ version });
  } catch (error) {
    return fail(error);
  }
}

export async function publishWorkbookAction(input: { patientId: string; workbookId: string; version: number }): Promise<ActionResult<{ assigned: number }>> {
  try {
    const session = await assertAdmin();
    const supabase = await createClient();
    const { timezone } = await getSetting(supabase, "scheduling");
    const res = await publishWorkbook(supabase, { workbookId: z.string().uuid().parse(input.workbookId), version: z.number().int().min(1).parse(input.version), approvedBy: session.userId, timezone });
    await audit(supabase, "workbook.published", { type: "patient", id: res.patientId }, { version: input.version, assigned: res.assigned });
    revalidatePath(`/admin/pacientes/${res.patientId}/cuadernillo`);
    revalidatePath(`/admin/pacientes/${res.patientId}`);
    return ok({ assigned: res.assigned });
  } catch (error) {
    return fail(error);
  }
}
