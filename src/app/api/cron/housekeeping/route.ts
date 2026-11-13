import { NextResponse, type NextRequest } from "next/server";

import { getServerEnv } from "@/lib/env";
import { createLogger, errorMeta } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_TIMEZONE, toDateKey } from "@/lib/dates";
import { previousPeriod, reportDueOn } from "@/lib/reports/biweekly";
import { pullGoogleChanges } from "@/server/services/google-calendar/sync";
import { saveReport } from "@/server/services/reports";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const log = createLogger("cron.housekeeping");

/**
 * Tareas diarias de mantenimiento:
 *  - limpiar contadores de rate limiting,
 *  - sincronizar cambios del calendario externo,
 *  - marcar como "ausente" los turnos confirmados que quedaron sin cerrar (más de 2 días atrás),
 *  - el 1 y el 16 de cada mes, generar el informe quincenal de la quincena que terminó.
 */
export async function GET(request: NextRequest) {
  const secret = getServerEnv().CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const admin = createAdminClient();
    const [{ data: cleaned }, google] = await Promise.all([admin.rpc("cleanup_rate_limits"), pullGoogleChanges()]);
    // Retención mínima: los eventos de webhook solo sirven para idempotencia (30 días alcanzan).
    const { count: purgedEvents } = await admin
      .from("whatsapp_webhook_events")
      .delete({ count: "exact" })
      .lt("received_at", new Date(Date.now() - 30 * 24 * 3600_000).toISOString());
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 3600_000).toISOString();
    const { data: stale } = await admin
      .from("appointments")
      .update({ status: "no_show" })
      .in("status", ["pending", "rescheduled"])
      .lt("end_time", twoDaysAgo)
      .select("id");
    const today = toDateKey(new Date(), DEFAULT_TIMEZONE);
    const report = reportDueOn(today) ? await saveReport(previousPeriod(today), { notify: true }) : null;
    return NextResponse.json({ ok: true, rate_limit_rows_removed: cleaned ?? 0, webhook_events_purged: purgedEvents ?? 0, google, stale_marked_no_show: stale?.length ?? 0, biweekly_report: report ? "saved" : "not_due" });
  } catch (error) {
    log.error("Housekeeping falló", errorMeta(error));
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
