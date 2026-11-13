import "server-only";

import { addDays } from "date-fns";

import { DEFAULT_TIMEZONE, toDateKey, zonedToUtc } from "@/lib/dates";
import { createLogger, errorMeta } from "@/lib/logger";
import { buildBiweeklyReport, periodLabel, previousPeriod, type BiweeklyReport, type Period } from "@/lib/reports/biweekly";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";

import { resolveTestDefs } from "./custom-tests";

const log = createLogger("reports");

type WorkbookContentLike = { chapters?: { prompts?: unknown[] }[] };

/**
 * Arma el informe de una quincena con todos los pacientes activos. Se lee con el cliente admin
 * (corre en el cron), por eso respeta a mano la preferencia de compartir registros: el ánimo,
 * los ejercicios y los hábitos solo se leen de quienes los comparten con el profesional.
 */
export async function computeReport(period: Period, now = new Date(), tz = DEFAULT_TIMEZONE): Promise<BiweeklyReport> {
  const admin = createAdminClient();
  const previous = previousPeriod(period.start);
  const from = zonedToUtc(previous.start, "00:00", tz).toISOString();
  const periodFrom = zonedToUtc(period.start, "00:00", tz).toISOString();
  const to = zonedToUtc(toDateKey(addDays(new Date(`${period.end}T12:00:00Z`), 1), "UTC"), "00:00", tz).toISOString();

  const { data: patientRows } = await admin.from("patients").select("id, first_name, last_name, share_records_with_professional").eq("status", "active");
  const patients = (patientRows ?? []).map((p) => ({ id: p.id, name: `${p.first_name} ${p.last_name}`.trim(), share: p.share_records_with_professional }));
  const ids = patients.map((p) => p.id);
  const sharing = patients.filter((p) => p.share).map((p) => p.id);
  const empty = { data: [] as never[] };

  const [appts, moods, exercises, habits, tests, workbooks] = await Promise.all([
    ids.length ? admin.from("appointments").select("patient_id, start_time, status").in("patient_id", ids).gte("start_time", periodFrom) : empty,
    sharing.length ? admin.from("emotional_logs").select("patient_id, logged_at, mood").in("patient_id", sharing).gte("logged_at", from).lt("logged_at", to) : empty,
    sharing.length ? admin.from("exercise_responses").select("patient_id, completed_at").in("patient_id", sharing).gte("completed_at", periodFrom).lt("completed_at", to) : empty,
    sharing.length ? admin.from("habit_logs").select("patient_id, habit_id, logged_on").in("patient_id", sharing).gte("logged_on", period.start).lte("logged_on", period.end) : empty,
    ids.length
      ? admin.from("test_responses").select("patient_id, test_id, score, max_score, band_label, level, risk, completed_at").in("patient_id", ids).gte("completed_at", periodFrom).lt("completed_at", to)
      : empty,
    ids.length ? admin.from("workbooks").select("id, patient_id, status, published_version").in("patient_id", ids).in("status", ["draft", "published"]) : empty,
  ]);

  const testDefs = await resolveTestDefs(admin, (tests.data ?? []).map((t) => t.test_id));

  const wbRows = workbooks.data ?? [];
  const published = wbRows.filter((w) => w.status === "published" && w.published_version);
  const [versions, answers] = await Promise.all([
    published.length ? admin.from("workbook_versions").select("workbook_id, version, content").in("workbook_id", published.map((w) => w.id)) : empty,
    wbRows.length ? admin.from("workbook_answers").select("workbook_id, updated_at").in("workbook_id", wbRows.map((w) => w.id)) : empty,
  ]);
  const promptCount = new Map<string, number>();
  for (const v of versions.data ?? []) {
    const w = published.find((x) => x.id === v.workbook_id);
    if (!w || w.published_version !== v.version) continue;
    const content = v.content as WorkbookContentLike;
    promptCount.set(w.id, (content.chapters ?? []).reduce((s, c) => s + (c.prompts?.length ?? 0), 0));
  }

  return buildBiweeklyReport({
    period,
    previous,
    tz,
    now,
    patients,
    appointments: appts.data ?? [],
    moods: moods.data ?? [],
    exercises: exercises.data ?? [],
    habits: habits.data ?? [],
    tests: (tests.data ?? []).map((t) => ({ ...t, title: testDefs.get(t.test_id)?.name ?? t.test_id })),
    workbooks: wbRows.map((w) => {
      const own = (answers.data ?? []).filter((a) => a.workbook_id === w.id);
      return {
        patient_id: w.patient_id,
        status: w.status,
        prompts: promptCount.get(w.id) ?? 0,
        answered: own.length,
        answeredInPeriod: own.filter((a) => a.updated_at >= periodFrom && a.updated_at < to).length,
      };
    }),
  });
}

/**
 * Guarda (o actualiza) el informe de la quincena y avisa al profesional. Si ya existía, lo
 * recalcula; el aviso sale una sola vez, cuando el informe de la quincena completa queda listo.
 */
export async function saveReport(period: Period, opts: { notify: boolean; now?: Date } = { notify: true }): Promise<string | null> {
  const admin = createAdminClient();
  try {
    const report = await computeReport(period, opts.now);
    const { data: existing } = await admin.from("clinical_reports").select("id, content").eq("period_start", period.start).eq("period_end", period.end).maybeSingle();
    let id = existing?.id ?? null;
    if (id) {
      await admin.from("clinical_reports").update({ content: report as unknown as Json, generated_at: new Date().toISOString() }).eq("id", id);
    } else {
      const { data, error } = await admin.from("clinical_reports").insert({ period_start: period.start, period_end: period.end, content: report as unknown as Json }).select("id").single();
      if (error) throw error;
      id = data.id;
    }
    // Avisa una sola vez por quincena completa (un informe parcial previo no cuenta como aviso).
    const wasPartial = existing ? Boolean((existing.content as { partial?: boolean } | null)?.partial) : true;
    if (opts.notify && !report.partial && wasPartial) {
      const { data: staff } = await admin.from("profiles").select("id").in("role", ["admin", "professional"]).eq("is_active", true);
      const t = report.totals;
      const body = `${periodLabel(period)}: ${t.patients} pacientes, ${t.sessionsDone} sesiones${t.withRisk ? `, ${t.withRisk} con alerta de riesgo` : ""}${t.withAlerts ? `, ${t.withAlerts} para revisar` : ""}.`;
      if (staff?.length) {
        await admin.from("notifications").insert(staff.map((s) => ({ user_id: s.id, type: "system" as const, title: "Informe quincenal listo", body, data: { report_id: id } })));
      }
    }
    return id;
  } catch (error) {
    log.error("No se pudo generar el informe quincenal", errorMeta(error));
    return null;
  }
}
