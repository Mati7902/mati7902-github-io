"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { assertSession } from "@/lib/auth/session";
import { type ActionResult, AppError, fail, ok } from "@/lib/errors";
import { safeInternalPath } from "@/lib/safe-redirect";
import { createClient } from "@/lib/supabase/server";
import { audit } from "@/server/services/audit";
import { allowAttempt } from "@/server/services/rate-limit";

const codeSchema = z.string().trim().regex(/^\d{6}$/, "El código tiene 6 números.");

async function verifiedFactorId(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string | null> {
  const { data } = await supabase.auth.mfa.listFactors();
  return data?.totp.find((f) => f.status === "verified")?.id ?? null;
}

/** Segundo paso del ingreso: valida el código de la app y eleva la sesión (aal2). */
export async function verifySecondFactorAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const code = codeSchema.safeParse(formData.get("code"));
  if (!code.success) return fail(new AppError("VALIDATION", "El código tiene 6 números."));
  let next = "/admin";
  try {
    const session = await assertSession();
    if (!(await allowAttempt(`mfa:${session.userId}`, 8, 15 * 60))) throw new AppError("RATE_LIMITED", "Demasiados intentos. Esperá unos minutos.");
    const supabase = await createClient();
    const factorId = await verifiedFactorId(supabase);
    if (!factorId) throw new AppError("VALIDATION", "Esta cuenta no tiene verificación en dos pasos.");
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: code.data });
    if (error) throw new AppError("UNAUTHENTICATED", "El código no es correcto o ya venció. Probá con el que muestra la app ahora.");
    await audit(supabase, "auth.second_factor_verified", { type: "profile", id: session.userId });
    next = safeInternalPath(String(formData.get("next") ?? ""), session.isAdmin ? "/admin" : "/app");
  } catch (error) {
    return fail(error);
  }
  redirect(next);
}

/** Empieza la activación: devuelve el QR y la clave para cargar en la app de códigos. */
export async function startSecondFactorAction(): Promise<ActionResult<{ factorId: string; qr: string; secret: string }>> {
  try {
    const session = await assertSession();
    if (!session.isAdmin) throw new AppError("FORBIDDEN", "Disponible para cuentas profesionales.");
    const supabase = await createClient();
    const { data: factors } = await supabase.auth.mfa.listFactors();
    if (factors?.totp.some((f) => f.status === "verified")) throw new AppError("VALIDATION", "La verificación en dos pasos ya está activa.");
    // Activaciones que quedaron a medias: se descartan para poder empezar de nuevo.
    for (const f of factors?.all.filter((x) => x.status === "unverified") ?? []) await supabase.auth.mfa.unenroll({ factorId: f.id });
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `App de códigos ${new Date().toISOString().slice(0, 10)}` });
    if (error || !data) throw new AppError("EXTERNAL", "No pudimos iniciar la activación. Revisá que la verificación en dos pasos esté habilitada en Supabase (Authentication › Multi-Factor).");
    return ok({ factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  } catch (error) {
    return fail(error);
  }
}

/** Confirma la activación con el primer código. Desde ese momento se pide en cada ingreso. */
export async function confirmSecondFactorAction(input: { factorId: string; code: string }): Promise<ActionResult> {
  const parsed = z.object({ factorId: z.string().uuid(), code: codeSchema }).safeParse(input);
  if (!parsed.success) return fail(new AppError("VALIDATION", "El código tiene 6 números."));
  try {
    const session = await assertSession();
    if (!session.isAdmin) throw new AppError("FORBIDDEN", "Disponible para cuentas profesionales.");
    const supabase = await createClient();
    const { error } = await supabase.auth.mfa.challengeAndVerify(parsed.data);
    if (error) throw new AppError("VALIDATION", "El código no coincide. Fijate que la hora del celular esté en automático y probá con el código nuevo.");
    await audit(supabase, "auth.second_factor_enabled", { type: "profile", id: session.userId });
    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}

/** Desactiva la verificación en dos pasos (pide un código vigente). */
export async function disableSecondFactorAction(input: { code: string }): Promise<ActionResult> {
  const code = codeSchema.safeParse(input.code);
  if (!code.success) return fail(new AppError("VALIDATION", "El código tiene 6 números."));
  try {
    const session = await assertSession();
    const supabase = await createClient();
    const factorId = await verifiedFactorId(supabase);
    if (!factorId) throw new AppError("VALIDATION", "La verificación en dos pasos no está activa.");
    const check = await supabase.auth.mfa.challengeAndVerify({ factorId, code: code.data });
    if (check.error) throw new AppError("UNAUTHENTICATED", "El código no es correcto.");
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) throw new AppError("EXTERNAL", "No pudimos desactivarla. Probá de nuevo.");
    await audit(supabase, "auth.second_factor_disabled", { type: "profile", id: session.userId });
    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}
