import "server-only";

import { fromDatabaseError, AppError } from "@/lib/errors";
import { intakeAge, type IntakeAnswers } from "@/lib/intake/form";
import { createLogger, errorMeta } from "@/lib/logger";
import { createAdminClient, type AdminSupabaseClient } from "@/lib/supabase/admin";
import type { ServerSupabaseClient } from "@/lib/supabase/server";
import { focusByKey } from "@/lib/clinical/focus";
import { deidentifiedIntake } from "@/lib/workbook/ai-input";
import { buildDraft, RULES_VERSION, type WorkbookContent, type WorkbookSources } from "@/lib/workbook/rules";
import { isWorkbookAIConfigured, writeWorkbookWithAI } from "@/server/services/ai/workbook-writer";
import { getSetting } from "@/server/services/settings";

const log = createLogger("workbooks");

type AnyClient = ServerSupabaseClient | AdminSupabaseClient;

export type WorkbookVersionRow = { id: string; version: number; origin: string; created_at: string; approved_at: string | null; content: WorkbookContent; sources: WorkbookSources };
export type AdminWorkbook = {
  id: string;
  title: string;
  status: "draft" | "published" | "archived";
  publishedVersion: number | null;
  publishedAt: string | null;
  latest: WorkbookVersionRow;
  history: Omit<WorkbookVersionRow, "content" | "sources">[];
};

const EMPTY_SOURCES: WorkbookSources = { reasons: {}, flags: [], missing: [] };

/** Cuadernillo en curso del paciente (borrador o publicado) con su última versión e historial. */
export async function getAdminWorkbook(client: AnyClient, patientId: string): Promise<AdminWorkbook | null> {
  const { data: w } = await client.from("workbooks").select("*").eq("patient_id", patientId).in("status", ["draft", "published"]).maybeSingle();
  if (!w) return null;
  const { data: versions, error } = await client.from("workbook_versions").select("id, version, origin, created_at, approved_at, content, sources").eq("workbook_id", w.id).order("version", { ascending: false });
  if (error) throw fromDatabaseError(error);
  const rows = (versions ?? []) as unknown as WorkbookVersionRow[];
  const latest = rows[0];
  if (!latest) return null;
  return {
    id: w.id,
    title: w.title,
    status: w.status as AdminWorkbook["status"],
    publishedVersion: w.published_version,
    publishedAt: w.published_at,
    latest: { ...latest, sources: { ...EMPTY_SOURCES, ...(latest.sources ?? {}) } },
    history: rows.map(({ id, version, origin, created_at, approved_at }) => ({ id, version, origin, created_at, approved_at })),
  };
}

/**
 * Arma un borrador con las reglas a partir de la ficha de ingreso. Si ya hay un cuadernillo en
 * curso, agrega una versión nueva (no pisa la publicada: el paciente la sigue viendo hasta que el
 * profesional apruebe la nueva). Usa el cliente admin: corre también al enviar la ficha.
 */
export async function generateDraft(patientId: string, createdBy: string | null, opts: { useAI?: boolean } = {}): Promise<{ workbookId: string; version: number; usedAI: boolean }> {
  const admin = createAdminClient();
  const [{ data: patient }, { data: intake }, { data: focus }, { data: templates }, identity] = await Promise.all([
    admin.from("patients").select("first_name").eq("id", patientId).maybeSingle(),
    admin.from("patient_intakes").select("answers, submitted_at").eq("patient_id", patientId).maybeSingle(),
    admin.from("patient_clinical_focus").select("focus_key").eq("patient_id", patientId),
    admin.from("exercise_templates").select("slug, title, estimated_minutes, description").eq("is_active", true),
    getSetting(admin, "site.identity"),
  ]);
  if (!patient) throw new AppError("NOT_FOUND", "No encontramos al paciente.");
  if (!intake?.submitted_at) throw new AppError("VALIDATION", "El paciente todavía no envió la ficha de ingreso.");
  const answers = (intake.answers ?? {}) as IntakeAnswers;
  const { content, sources } = buildDraft({
    answers,
    age: intakeAge(answers),
    firstName: patient.first_name,
    professionalName: identity.professional_name,
    templates: templates ?? [],
    focusKeys: (focus ?? []).map((f) => f.focus_key),
  });

  // Cuadernillo redactado con IA (como cuando lo armás en el chat), con la ficha sin datos que
  // identifiquen. Las alertas sensibles salen siempre de las reglas, no de la IA.
  let origin: "rules" | "ai" = "rules";
  if (opts.useAI !== false && isWorkbookAIConfigured()) {
    const { age, lines } = deidentifiedIntake(answers);
    const focusLabels = (focus ?? []).map((f) => focusByKey(f.focus_key)?.label).filter((l): l is string => Boolean(l));
    const ai = await writeWorkbookWithAI({ age, intakeLines: lines, focusLabels, library: (templates ?? []).map((t) => ({ slug: t.slug, title: t.title, description: t.description })) });
    if (ai) {
      origin = "ai";
      const bySlug = new Map((templates ?? []).map((t) => [t.slug, t]));
      content.welcome = `Hola, ${patient.first_name}. ${ai.welcome}`;
      if (ai.goals.length) content.goals = ai.goals;
      content.chapters = ai.chapters;
      if (ai.library.length) {
        content.items = ai.library.map((slug, i) => ({ slug, title: bySlug.get(slug)!.title, minutes: bySlug.get(slug)!.estimated_minutes, note: null, dueInDays: (i + 1) * 3 }));
        for (const slug of ai.library) (sources.reasons[slug] ??= []).push("Elegido por la IA para este paciente");
      }
      content.closing = `${ai.closing} — ${identity.professional_name}`;
      sources.flags.unshift("Redactado con IA a partir de la ficha (sin nombre ni datos de contacto). Revisá cada capítulo antes de aprobar.", ...ai.notes.map((n) => `IA: ${n}`));
    } else {
      sources.flags.unshift("No se pudo redactar con IA (sin clave, límite de uso o la IA declinó): se armó con las reglas.");
    }
  }

  let { data: workbook } = await admin.from("workbooks").select("id").eq("patient_id", patientId).in("status", ["draft", "published"]).maybeSingle();
  if (!workbook) {
    const created = await admin.from("workbooks").insert({ patient_id: patientId, created_by: createdBy }).select("id").single();
    if (created.error) throw fromDatabaseError(created.error);
    workbook = created.data;
  }
  const version = await nextVersion(admin, workbook.id);
  const { error } = await admin.from("workbook_versions").insert({ workbook_id: workbook.id, version, content: content as never, sources: sources as never, rules_version: RULES_VERSION, origin, created_by: createdBy });
  if (error) throw fromDatabaseError(error);
  return { workbookId: workbook.id, version, usedAI: origin === "ai" };
}

async function nextVersion(client: AnyClient, workbookId: string): Promise<number> {
  const { data } = await client.from("workbook_versions").select("version").eq("workbook_id", workbookId).order("version", { ascending: false }).limit(1).maybeSingle();
  return (data?.version ?? 0) + 1;
}

/** Guarda la edición del profesional como una versión nueva (las anteriores quedan en el historial). */
export async function saveWorkbookVersion(client: ServerSupabaseClient, workbookId: string, content: WorkbookContent, createdBy: string): Promise<number> {
  const { data: prev } = await client.from("workbook_versions").select("sources").eq("workbook_id", workbookId).order("version", { ascending: false }).limit(1).maybeSingle();
  const version = await nextVersion(client, workbookId);
  const { error } = await client.from("workbook_versions").insert({ workbook_id: workbookId, version, content: content as never, sources: (prev?.sources ?? {}) as never, origin: "edit", created_by: createdBy });
  if (error) throw fromDatabaseError(error, "No pudimos guardar el cuadernillo.");
  return version;
}

/**
 * Aprueba y publica una versión: el paciente la ve en "Mi cuadernillo" y sus actividades quedan
 * asignadas (así funcionan en la app como cualquier ejercicio asignado y cuentan en Mi Progreso).
 */
export async function publishWorkbook(client: ServerSupabaseClient, input: { workbookId: string; version: number; approvedBy: string; timezone: string }): Promise<{ assigned: number; patientId: string }> {
  const { data: w } = await client.from("workbooks").select("id, patient_id").eq("id", input.workbookId).maybeSingle();
  if (!w) throw new AppError("NOT_FOUND", "No encontramos el cuadernillo.");
  const { data: v } = await client.from("workbook_versions").select("id, content").eq("workbook_id", w.id).eq("version", input.version).maybeSingle();
  if (!v) throw new AppError("NOT_FOUND", "No encontramos esa versión.");
  const content = v.content as unknown as WorkbookContent;
  const now = new Date();

  const { error: e1 } = await client.from("workbook_versions").update({ approved_at: now.toISOString(), approved_by: input.approvedBy }).eq("id", v.id);
  if (e1) throw fromDatabaseError(e1);
  const { error: e2 } = await client.from("workbooks").update({ status: "published", published_version: input.version, published_at: now.toISOString() }).eq("id", w.id);
  if (e2) throw fromDatabaseError(e2);

  // Asignaciones: solo las que no estén ya pendientes para ese ejercicio.
  const slugs = content.items.map((i) => i.slug);
  const [{ data: templates }, { data: pending }] = await Promise.all([
    client.from("exercise_templates").select("id, slug").in("slug", slugs.length ? slugs : ["-"]),
    client.from("exercise_assignments").select("template_id").eq("patient_id", w.patient_id).is("completed_at", null),
  ]);
  const idBySlug = new Map((templates ?? []).map((t) => [t.slug, t.id]));
  const pendingIds = new Set((pending ?? []).map((p) => p.template_id));
  const rows = content.items.flatMap((item) => {
    const templateId = idBySlug.get(item.slug);
    if (!templateId || pendingIds.has(templateId)) return [];
    const due = item.dueInDays ? new Date(now.getTime() + item.dueInDays * 24 * 3600_000).toISOString() : null;
    return [{ patient_id: w.patient_id, template_id: templateId, assigned_by: input.approvedBy, note: item.note, due_at: due }];
  });
  if (rows.length) {
    const { error } = await client.from("exercise_assignments").insert(rows);
    if (error) throw fromDatabaseError(error, "Se publicó, pero no pudimos asignar las actividades.");
  }

  // Aviso al paciente (no es crítico: si falla, el cuadernillo igual quedó publicado).
  try {
    const admin = createAdminClient();
    const { data: p } = await admin.from("patients").select("profile_id").eq("id", w.patient_id).maybeSingle();
    if (p?.profile_id) {
      await admin.from("notifications").insert({ user_id: p.profile_id, type: "exercise_assigned", title: "Tu cuadernillo está listo", body: "Tu psicólogo preparó actividades para vos. Lo encontrás en Ejercicios › Mi cuadernillo.", data: { workbook_id: w.id } });
    }
  } catch (error) {
    log.warn("No se pudo avisar al paciente del cuadernillo", errorMeta(error));
  }
  return { assigned: rows.length, patientId: w.patient_id };
}

/** Cuadernillo publicado del paciente (lo lee con su sesión; nunca ve fuentes ni alertas). */
export async function getMyWorkbook(client: ServerSupabaseClient): Promise<{ workbookId: string; title: string; version: number; content: WorkbookContent; publishedAt: string } | null> {
  const { data } = await client.rpc("my_published_workbook");
  const row = Array.isArray(data) ? data[0] : null;
  if (!row) return null;
  return { workbookId: row.workbook_id, title: row.title, version: row.version, content: row.content as unknown as WorkbookContent, publishedAt: row.published_at };
}

/** Al enviar la ficha: arma el borrador y avisa al profesional. Nunca rompe el envío de la ficha. */
export async function draftAfterIntake(patientId: string): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data: open } = await admin.from("workbooks").select("id").eq("patient_id", patientId).in("status", ["draft", "published"]).maybeSingle();
    if (open) return; // Ya hay uno: el profesional decide si regenerar.
    await generateDraft(patientId, null);
    const [{ data: staff }, { data: patient }] = await Promise.all([
      admin.from("profiles").select("id").in("role", ["admin", "professional"]).eq("is_active", true),
      admin.from("patients").select("first_name, last_name").eq("id", patientId).maybeSingle(),
    ]);
    if (staff?.length && patient) {
      await admin.from("notifications").insert(
        staff.map((s) => ({ user_id: s.id, type: "system" as const, title: `Borrador de cuadernillo: ${patient.first_name} ${patient.last_name}`, body: "Se armó a partir de la ficha de ingreso. Revisalo y aprobalo antes de que lo vea el paciente.", data: { patient_id: patientId } })),
      );
    }
  } catch (error) {
    log.warn("No se pudo armar el borrador del cuadernillo", errorMeta(error));
  }
}
