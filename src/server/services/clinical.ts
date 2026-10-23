import "server-only";

import { assignableTest, bundleFor, focusByKey } from "@/lib/clinical/focus";
import { scoreTest, summaryText, type Answers } from "@/lib/guia/scoring";
import { AppError, fromDatabaseError } from "@/lib/errors";
import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import type { ServerSupabaseClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export type ClinicalFocusRow = Tables<"patient_clinical_focus">;
export type TestAssignment = Tables<"test_assignments">;
export type TestResponse = Tables<"test_responses">;

/** Diagnóstico probable del paciente (solo el profesional puede leerlo: RLS). */
export async function getClinicalFocus(client: ServerSupabaseClient, patientId: string): Promise<ClinicalFocusRow[]> {
  const { data } = await client.from("patient_clinical_focus").select("*").eq("patient_id", patientId).order("created_at");
  return data ?? [];
}

/** Materiales de la biblioteca que abren cada ejercicio (slug → id del material). */
export async function materialsBySlug(client: ServerSupabaseClient, slugs: string[]): Promise<Map<string, { id: string; title: string; published: boolean }>> {
  if (slugs.length === 0) return new Map();
  const { data } = await client.from("materials").select("id, title, is_published, exercise_templates!inner(slug)").in("exercise_templates.slug", slugs);
  const map = new Map<string, { id: string; title: string; published: boolean }>();
  for (const row of data ?? []) {
    const slug = (row.exercise_templates as { slug: string } | null)?.slug;
    if (slug) map.set(slug, { id: row.id, title: row.title, published: row.is_published });
  }
  return map;
}

export type ApplyFocusInput = {
  patientId: string;
  focus: { key: string; icd10?: string | null; note?: string | null }[];
  /** Slugs de los ejercicios cuyos materiales se habilitan (los que el profesional dejó tildados). */
  materials: string[];
  tests: string[];
  showResults: boolean;
  assignedBy: string;
};

/**
 * Guarda el diagnóstico probable y habilita los recursos elegidos: asigna los materiales
 * (el paciente los ve en su biblioteca y recibe una notificación) y los tests (un test no
 * se duplica si ya está pendiente). Devuelve cuántos recursos nuevos se habilitaron.
 */
export async function applyClinicalFocus(client: ServerSupabaseClient, input: ApplyFocusInput): Promise<{ materials: number; tests: number }> {
  const keys = input.focus.map((f) => f.key).filter((k) => focusByKey(k));
  // Solo recursos que pertenecen a los cuadros elegidos (evita habilitar cualquier cosa por la URL).
  const allowed = bundleFor(keys);
  const materialSlugs = input.materials.filter((m) => allowed.materials.includes(m));
  const testIds = input.tests.filter((t) => allowed.tests.includes(t) && assignableTest(t));

  const { error: delError } = await client.from("patient_clinical_focus").delete().eq("patient_id", input.patientId).not("focus_key", "in", `(${keys.map((k) => `"${k}"`).join(",") || '""'})`);
  if (delError) throw fromDatabaseError(delError);
  if (keys.length > 0) {
    const rows = input.focus
      .filter((f) => keys.includes(f.key))
      .map((f) => ({ patient_id: input.patientId, focus_key: f.key, icd10: f.icd10?.trim() || null, note: f.note?.trim() || null, created_by: input.assignedBy, updated_at: new Date().toISOString() }));
    const { error } = await client.from("patient_clinical_focus").upsert(rows, { onConflict: "patient_id,focus_key" });
    if (error) throw fromDatabaseError(error, "No pudimos guardar el diagnóstico.");
  }

  const [materials, { data: existingMaterials }, { data: pendingTests }] = await Promise.all([
    materialsBySlug(client, materialSlugs),
    client.from("patient_materials").select("material_id").eq("patient_id", input.patientId).not("assigned_by", "is", null),
    client.from("test_assignments").select("test_id").eq("patient_id", input.patientId).eq("status", "pending"),
  ]);
  const already = new Set((existingMaterials ?? []).map((m) => m.material_id));
  const newMaterials = materialSlugs.map((s) => materials.get(s)).filter((m): m is { id: string; title: string; published: boolean } => Boolean(m && m.published && !already.has(m.id)));
  if (newMaterials.length > 0) {
    const now = new Date().toISOString();
    const { error } = await client
      .from("patient_materials")
      .upsert(newMaterials.map((m) => ({ patient_id: input.patientId, material_id: m.id, assigned_by: input.assignedBy, assigned_at: now })), { onConflict: "patient_id,material_id" });
    if (error) throw fromDatabaseError(error, "No pudimos habilitar los materiales.");
  }

  const pending = new Set((pendingTests ?? []).map((t) => t.test_id));
  const newTests = testIds.filter((t) => !pending.has(t));
  if (newTests.length > 0) {
    const focusOf = (testId: string) => keys.find((k) => focusByKey(k)?.tests.includes(testId)) ?? null;
    const { error } = await client
      .from("test_assignments")
      .insert(newTests.map((t) => ({ patient_id: input.patientId, test_id: t, assigned_by: input.assignedBy, show_result: input.showResults, focus_key: focusOf(t) })));
    if (error) throw fromDatabaseError(error, "No pudimos asignar los tests.");
  }
  return { materials: newMaterials.length, tests: newTests.length };
}

export async function assignTest(client: ServerSupabaseClient, input: { patientId: string; testId: string; showResult: boolean; dueOn?: string | null; note?: string | null; assignedBy: string }) {
  if (!assignableTest(input.testId)) throw new AppError("VALIDATION", "Ese test no se puede asignar para completar en casa.");
  const { error } = await client.from("test_assignments").insert({
    patient_id: input.patientId,
    test_id: input.testId,
    show_result: input.showResult,
    due_on: input.dueOn || null,
    note: input.note?.trim() || null,
    assigned_by: input.assignedBy,
  });
  if (error?.code === "23505") throw new AppError("CONFLICT", "Ese test ya está pendiente para este paciente.");
  if (error) throw fromDatabaseError(error, "No pudimos asignar el test.");
}

export async function cancelTestAssignment(client: ServerSupabaseClient, assignmentId: string) {
  const { error } = await client.from("test_assignments").update({ status: "cancelled" }).eq("id", assignmentId).eq("status", "pending");
  if (error) throw fromDatabaseError(error);
}

export async function listTestAssignments(client: ServerSupabaseClient, patientId: string): Promise<TestAssignment[]> {
  const { data } = await client.from("test_assignments").select("*").eq("patient_id", patientId).order("assigned_at", { ascending: false });
  return data ?? [];
}

export async function listTestResponses(client: ServerSupabaseClient, patientId: string): Promise<TestResponse[]> {
  const { data } = await client.from("test_responses").select("*").eq("patient_id", patientId).order("completed_at", { ascending: true });
  return data ?? [];
}

/** Convierte las respuestas del formulario (índice → valor) validando que existan en el test. */
export function parseAnswers(testId: string, raw: Record<string, string>): Answers {
  const def = assignableTest(testId);
  if (!def) throw new AppError("VALIDATION", "Test desconocido.");
  const allowed = new Set(def.options.map((o) => o.value));
  const answers: Answers = {};
  def.items.forEach((_, i) => {
    const v = raw[String(i)];
    if (v === undefined || v === "") throw new AppError("VALIDATION", "Respondé todas las preguntas antes de enviar.");
    if (!allowed.has(v)) throw new AppError("VALIDATION", "Hay una respuesta que no es válida.");
    answers[i] = v;
  });
  return answers;
}

/**
 * Guarda las respuestas de un test asignado. El puntaje lo calcula el servidor con la misma
 * lógica de la guía clínica. Si hay una alerta crítica (por ejemplo, ideación suicida en el
 * ítem 9 del PHQ-9), se marca como riesgo y se avisa al profesional en el panel.
 */
export async function submitTestResponse(
  admin: AdminSupabaseClient,
  input: { assignmentId: string; patientId: string; patientName: string; raw: Record<string, string> },
): Promise<{ risk: boolean; showResult: boolean }> {
  const { data: assignment } = await admin.from("test_assignments").select("*").eq("id", input.assignmentId).eq("patient_id", input.patientId).maybeSingle();
  if (!assignment) throw new AppError("NOT_FOUND", "No encontramos ese test.");
  if (assignment.status !== "pending") throw new AppError("CONFLICT", "Este test ya fue respondido.");
  const def = assignableTest(assignment.test_id);
  if (!def) throw new AppError("VALIDATION", "Test desconocido.");

  const answers = parseAnswers(def.id, input.raw);
  const result = scoreTest(def, answers);
  const risk = result.flags.some((f) => f.level === "crit") || result.band?.level === "crit";
  const { error } = await admin.from("test_responses").insert({
    assignment_id: assignment.id,
    patient_id: input.patientId,
    test_id: def.id,
    answers: Object.fromEntries(Object.entries(answers).map(([k, v]) => [k, v ?? null])),
    score: result.score,
    max_score: def.max,
    band_label: result.band?.label ?? null,
    level: risk ? "crit" : (result.band?.level ?? null),
    flags: result.flags,
    summary: summaryText(def, answers, result),
    risk,
  });
  if (error?.code === "23505") throw new AppError("CONFLICT", "Este test ya fue respondido.");
  if (error) throw fromDatabaseError(error, "No pudimos guardar tus respuestas.");
  await admin.from("test_assignments").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", assignment.id);

  const { data: staff } = await admin.from("profiles").select("id").in("role", ["admin", "professional"]).eq("is_active", true);
  if (staff?.length) {
    const title = risk ? `URGENTE: alerta de riesgo en ${def.name}` : `${def.name} respondido`;
    const body = risk
      ? `${input.patientName} marcó una respuesta de riesgo. Revisá su ficha y contactalo cuanto antes.`
      : `${input.patientName} completó el ${def.name}.`;
    await admin.from("notifications").insert(staff.map((p) => ({ user_id: p.id, type: "system" as const, title, body, data: { patient_id: input.patientId, test_assignment_id: assignment.id, risk } })));
  }
  return { risk, showResult: assignment.show_result };
}
