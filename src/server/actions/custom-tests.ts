"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { assertAdmin } from "@/lib/auth/session";
import { type ActionResult, fail, ok, validationFail } from "@/lib/errors";
import { newCustomCode } from "@/lib/guia/custom-tests";
import { createClient } from "@/lib/supabase/server";
import { zodFieldErrors } from "@/lib/validation";
import { audit } from "@/server/services/audit";

const schema = z
  .object({
    id: z.string().uuid().optional(),
    name: z.string().trim().min(2, "Escribí un nombre corto.").max(40),
    full_name: z.string().trim().min(2, "Escribí el nombre completo.").max(160),
    instructions: z.string().trim().min(2, "Escribí la consigna.").max(600),
    kind: z.enum(["vf", "scale"]),
    scale_min: z.number().int().min(0).max(1).nullable(),
    scale_max: z.number().int().min(2).max(10).nullable(),
    min_label: z.string().trim().max(40).nullable(),
    max_label: z.string().trim().max(40).nullable(),
    items: z
      .array(z.object({ text: z.string().trim().min(1).max(300), scoresIf: z.enum(["v", "f"]).optional(), reverse: z.boolean().optional() }))
      .min(1, "Agregá al menos un ítem.")
      .max(60),
    bands: z.array(z.object({ upTo: z.number().int().min(0).max(600), label: z.string().trim().min(1).max(60), level: z.enum(["ok", "warn", "crit"]) })).max(6),
    note: z.string().trim().max(600).nullable(),
    is_active: z.boolean(),
  })
  .refine((t) => t.kind === "vf" || (t.scale_min !== null && t.scale_max !== null), { message: "Elegí el rango de la escala.", path: ["scale_max"] });

/** Crear o editar un test propio. Si ya se respondió, editar los ítems cambia cómo se leen los resultados: se avisa en la pantalla. */
export async function saveCustomTestAction(input: z.input<typeof schema>): Promise<ActionResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return validationFail(zodFieldErrors(parsed.error));
  try {
    const session = await assertAdmin();
    const supabase = await createClient();
    const { id, ...t } = parsed.data;
    const row = { ...t, scale_min: t.kind === "scale" ? t.scale_min : null, scale_max: t.kind === "scale" ? t.scale_max : null, items: t.items as never, bands: t.bands as never, note: t.note || null, min_label: t.min_label || null, max_label: t.max_label || null };
    const { error } = id ? await supabase.from("custom_tests").update(row).eq("id", id) : await supabase.from("custom_tests").insert({ ...row, code: newCustomCode(), created_by: session.userId });
    if (error) throw error;
    await audit(supabase, "custom_test.saved", { type: "custom_test", id: id ?? null });
    revalidatePath("/admin/instrumentos");
    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}
