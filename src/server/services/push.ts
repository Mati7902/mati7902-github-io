import "server-only";

import webpush from "web-push";

import { getServerEnv } from "@/lib/env";
import { createLogger, errorMeta } from "@/lib/logger";
import { localClock, nudgeDue, nudgeMessage } from "@/lib/push/nudges";
import { createAdminClient } from "@/lib/supabase/admin";

const log = createLogger("push");

export type PushPayload = { title: string; body?: string; url?: string; tag?: string };

let cached: { publicKey: string; privateKey: string } | null = null;

/** Claves VAPID: se generan la primera vez y se guardan en la base (solo el servidor las lee). */
export async function getVapidKeys(): Promise<{ publicKey: string; privateKey: string }> {
  if (cached) return cached;
  const admin = createAdminClient();
  const { data } = await admin.from("push_config").select("public_key, private_key").maybeSingle();
  if (data) return (cached = { publicKey: data.public_key, privateKey: data.private_key });
  const keys = webpush.generateVAPIDKeys();
  await admin.from("push_config").upsert({ id: true, public_key: keys.publicKey, private_key: keys.privateKey }, { onConflict: "id", ignoreDuplicates: true });
  // Si dos pedidos llegaron a la vez, gana la primera fila guardada.
  const { data: saved } = await admin.from("push_config").select("public_key, private_key").single();
  return (cached = { publicKey: saved?.public_key ?? keys.publicKey, privateKey: saved?.private_key ?? keys.privateKey });
}

/**
 * Envía una notificación a todos los dispositivos del usuario. Nunca lanza: si falla, la
 * notificación in-app sigue estando. Las suscripciones vencidas (404/410) se borran.
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<number> {
  try {
    const admin = createAdminClient();
    const { data: subs } = await admin.from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("user_id", userId);
    if (!subs?.length) return 0;
    const { publicKey, privateKey } = await getVapidKeys();
    const subject = getServerEnv().NEXT_PUBLIC_APP_URL.startsWith("https://") ? getServerEnv().NEXT_PUBLIC_APP_URL : "https://matiassanchezpsicologo.com";
    let sent = 0;
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), {
            vapidDetails: { subject, publicKey, privateKey },
            TTL: 12 * 3600,
            urgency: "normal",
          });
          sent++;
          await admin.from("push_subscriptions").update({ last_ok_at: new Date().toISOString() }).eq("id", s.id);
        } catch (error) {
          const status = (error as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) await admin.from("push_subscriptions").delete().eq("id", s.id);
          else log.warn("Push falló", { status: status ?? null, ...errorMeta(error) });
        }
      }),
    );
    return sent;
  } catch (error) {
    log.warn("No se pudo enviar push", errorMeta(error));
    return 0;
  }
}

/**
 * Recordatorios suaves elegidos por cada paciente (corre con el cron de recordatorios, cada 15 min).
 * El día queda marcado antes de enviar, con un update condicional: sin duplicados.
 */
export async function runDailyNudges(tz: string, now = new Date()): Promise<{ due: number; sent: number }> {
  const admin = createAdminClient();
  const clock = localClock(now, tz);
  const { data: prefs } = await admin.from("reminder_prefs").select("*").eq("hour", clock.hour);
  const due = (prefs ?? []).filter((p) => nudgeDue(p, clock));
  let sent = 0;
  for (const p of due) {
    const { data: claimed } = await admin
      .from("reminder_prefs")
      .update({ last_sent_on: clock.day })
      .eq("user_id", p.user_id)
      .or(`last_sent_on.is.null,last_sent_on.neq.${clock.day}`)
      .select("user_id");
    if (!claimed?.length) continue;
    const { data: patient } = await admin.from("patients").select("id, status").eq("profile_id", p.user_id).maybeSingle();
    if (!patient || patient.status !== "active") continue;
    const dayStart = new Date(now.getTime() - 20 * 3600_000).toISOString();
    const [{ count: moods }, { count: habits }, { count: workbooks }] = await Promise.all([
      admin.from("emotional_logs").select("id", { count: "exact", head: true }).eq("patient_id", patient.id).gte("logged_at", dayStart),
      admin.from("habit_logs").select("habit_id", { count: "exact", head: true }).eq("patient_id", patient.id).eq("logged_on", clock.day),
      admin.from("workbooks").select("id", { count: "exact", head: true }).eq("patient_id", patient.id).eq("status", "published"),
    ]);
    const msg = nudgeMessage(p, { moodToday: (moods ?? 0) > 0, habitToday: (habits ?? 0) > 0, hasWorkbook: (workbooks ?? 0) > 0 });
    if (!msg) continue;
    sent += (await sendPushToUser(p.user_id, { ...msg, tag: "recordatorio-diario" })) > 0 ? 1 : 0;
  }
  return { due: due.length, sent };
}
