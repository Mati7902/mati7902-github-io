"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { assertPatient } from "@/lib/auth/session";
import { toDateKey } from "@/lib/dates";
import { type ActionResult, AppError, fail, ok, validationFail } from "@/lib/errors";
import { ALL_HABIT_IDS } from "@/lib/habits/data";
import { createClient } from "@/lib/supabase/server";
import { zodFieldErrors } from "@/lib/validation";
import { nutritionAllowed } from "@/server/services/habits";
import { getSetting } from "@/server/services/settings";

const schema = z.object({ habitId: z.string().refine((id) => ALL_HABIT_IDS.includes(id), "Hábito desconocido."), day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), done: z.boolean() });

/** Marca o desmarca un hábito en un día (hoy o hasta 3 días atrás). */
export async function toggleHabitAction(input: z.infer<typeof schema>): Promise<ActionResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return validationFail(zodFieldErrors(parsed.error));
  try {
    const { patient } = await assertPatient();
    const supabase = await createClient();
    const { timezone } = await getSetting(supabase, "scheduling");
    const today = toDateKey(new Date(), timezone);
    const { habitId, day, done } = parsed.data;
    if (day > today) throw new AppError("VALIDATION", "No se pueden marcar días futuros.");
    if (habitId.startsWith("ali-") && !(await nutritionAllowed(patient.id))) throw new AppError("FORBIDDEN", "Este hábito lo trabajamos en sesión.");
    const { error } = done
      ? await supabase.from("habit_logs").upsert({ patient_id: patient.id, habit_id: habitId, logged_on: day }, { onConflict: "patient_id,habit_id,logged_on", ignoreDuplicates: true })
      : await supabase.from("habit_logs").delete().eq("patient_id", patient.id).eq("habit_id", habitId).eq("logged_on", day);
    if (error) throw error;
    revalidatePath("/app/habitos");
    revalidatePath("/app/progreso");
    revalidatePath("/app");
    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}
