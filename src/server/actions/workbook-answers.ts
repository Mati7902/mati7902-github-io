"use server";

import { z } from "zod";

import { assertPatient } from "@/lib/auth/session";
import { type ActionResult, fail, ok, validationFail } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { zodFieldErrors } from "@/lib/validation";

const schema = z.object({ workbookId: z.string().uuid(), promptKey: z.string().regex(/^c[0-9]{1,2}p[0-9]{1,2}$/), answer: z.string().max(5000) });

/** El paciente guarda lo que escribió en una hoja de trabajo de su cuadernillo. */
export async function saveWorkbookAnswerAction(input: z.infer<typeof schema>): Promise<ActionResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return validationFail(zodFieldErrors(parsed.error));
  try {
    const { patient } = await assertPatient();
    const supabase = await createClient();
    const { workbookId, promptKey, answer } = parsed.data;
    const { error } = answer.trim()
      ? await supabase.from("workbook_answers").upsert({ workbook_id: workbookId, patient_id: patient.id, prompt_key: promptKey, answer }, { onConflict: "workbook_id,prompt_key" })
      : await supabase.from("workbook_answers").delete().eq("workbook_id", workbookId).eq("prompt_key", promptKey);
    if (error) throw error;
    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}
