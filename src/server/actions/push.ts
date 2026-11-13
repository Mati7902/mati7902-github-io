"use server";

import { z } from "zod";

import { assertSession } from "@/lib/auth/session";
import { type ActionResult, fail, ok } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { getVapidKeys, sendPushToUser } from "@/server/services/push";

export async function getPushPublicKeyAction(): Promise<ActionResult<{ key: string }>> {
  try {
    await assertSession();
    return ok({ key: (await getVapidKeys()).publicKey });
  } catch (error) {
    return fail(error);
  }
}

const subSchema = z.object({
  endpoint: z.string().url().startsWith("https://").max(1000),
  keys: z.object({ p256dh: z.string().min(10).max(200), auth: z.string().min(8).max(100) }),
  userAgent: z.string().max(300).optional(),
});

export async function savePushSubscriptionAction(input: z.infer<typeof subSchema>): Promise<ActionResult> {
  const parsed = subSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error);
  try {
    const session = await assertSession();
    const supabase = await createClient();
    // Un dispositivo por fila; si ya estaba registrado para esta cuenta, se actualizan sus claves.
    const { error } = await supabase.from("push_subscriptions").upsert(
      { user_id: session.userId, endpoint: parsed.data.endpoint, p256dh: parsed.data.keys.p256dh, auth: parsed.data.keys.auth, user_agent: parsed.data.userAgent ?? null },
      { onConflict: "endpoint" },
    );
    if (error) throw error;
    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}

export async function deletePushSubscriptionAction(endpoint: string): Promise<ActionResult> {
  try {
    const session = await assertSession();
    const supabase = await createClient();
    await supabase.from("push_subscriptions").delete().eq("user_id", session.userId).eq("endpoint", endpoint);
    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}

export async function sendTestPushAction(): Promise<ActionResult<{ sent: number }>> {
  try {
    const session = await assertSession();
    const sent = await sendPushToUser(session.userId, { title: "¡Listo!", body: "Las notificaciones funcionan en este dispositivo.", url: "/app/perfil", tag: "prueba" });
    return ok({ sent });
  } catch (error) {
    return fail(error);
  }
}

const prefsSchema = z.object({
  mood: z.boolean(),
  habits: z.boolean(),
  workbook: z.boolean(),
  hour: z.number().int().min(7).max(22),
  days: z.array(z.number().int().min(1).max(7)).min(1).max(7),
});

export async function saveReminderPrefsAction(input: z.infer<typeof prefsSchema>): Promise<ActionResult> {
  const parsed = prefsSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error);
  try {
    const session = await assertSession();
    const supabase = await createClient();
    const { error } = await supabase
      .from("reminder_prefs")
      .upsert({ user_id: session.userId, ...parsed.data, days: [...new Set(parsed.data.days)].sort(), updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    if (error) throw error;
    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}
