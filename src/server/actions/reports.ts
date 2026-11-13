"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { assertAdmin } from "@/lib/auth/session";
import { DEFAULT_TIMEZONE, toDateKey } from "@/lib/dates";
import { AppError, type ActionResult, fail, ok } from "@/lib/errors";
import { periodContaining, previousPeriod } from "@/lib/reports/biweekly";
import { saveReport } from "@/server/services/reports";

/** «Generar ahora»: la quincena en curso hasta hoy, o la anterior completa. No envía aviso. */
export async function generateReportAction(input: { which: "current" | "previous" }): Promise<ActionResult<{ id: string }>> {
  const parsed = z.object({ which: z.enum(["current", "previous"]) }).safeParse(input);
  if (!parsed.success) return fail(parsed.error);
  try {
    await assertAdmin();
    const today = toDateKey(new Date(), DEFAULT_TIMEZONE);
    const period = parsed.data.which === "current" ? periodContaining(today) : previousPeriod(today);
    const id = await saveReport(period, { notify: false });
    if (!id) throw new AppError("UNKNOWN", "No se pudo generar el informe. Probá de nuevo en un momento.");
    revalidatePath("/admin/informes");
    revalidatePath(`/admin/informes/${id}`);
    return ok({ id });
  } catch (error) {
    return fail(error);
  }
}
