import "server-only";

import type { ServerSupabaseClient } from "@/lib/supabase/server";
import { resolveTestDefs } from "@/server/services/custom-tests";

export type InboxItem = {
  key: string;
  kind: "risk" | "intake" | "test" | "workbook";
  title: string;
  detail: string;
  href: string;
  at: string;
  /** Para marcar como revisado (las fichas y los tests). Los borradores salen al publicarlos. */
  review?: { itemType: "intake" | "test_response"; itemId: string };
};

const ORDER: Record<InboxItem["kind"], number> = { risk: 0, intake: 1, workbook: 2, test: 3 };
const name = (p: { first_name: string; last_name: string }) => `${p.first_name} ${p.last_name}`;

/**
 * Lo que espera una decisión del profesional, con lo urgente primero: respuestas de riesgo,
 * fichas de ingreso nuevas, borradores de cuadernillo y tests respondidos (últimos 30 días).
 */
export async function getReviewInbox(client: ServerSupabaseClient): Promise<InboxItem[]> {
  const since = new Date(Date.now() - 30 * 24 * 3600_000).toISOString();
  const [{ data: reviews }, { data: intakes }, { data: responses }, { data: drafts }] = await Promise.all([
    client.from("clinical_reviews").select("item_type, item_id, reviewed_at").gte("reviewed_at", new Date(Date.now() - 90 * 24 * 3600_000).toISOString()),
    client.from("patient_intakes").select("patient_id, submitted_at").not("submitted_at", "is", null).gte("submitted_at", since),
    client.from("test_responses").select("id, patient_id, test_id, risk, band_label, completed_at").gte("completed_at", since).order("completed_at", { ascending: false }).limit(50),
    client.from("workbooks").select("id, patient_id, status, published_version, updated_at").in("status", ["draft", "published"]),
  ]);
  const patientIds = [...new Set([...(intakes ?? []).map((i) => i.patient_id), ...(responses ?? []).map((r) => r.patient_id), ...(drafts ?? []).map((w) => w.patient_id)])];
  const [{ data: patients }, { data: versions }] = await Promise.all([
    patientIds.length ? client.from("patients").select("id, first_name, last_name").in("id", patientIds) : Promise.resolve({ data: [] as { id: string; first_name: string; last_name: string }[] }),
    (drafts ?? []).length ? client.from("workbook_versions").select("workbook_id, version").in("workbook_id", (drafts ?? []).map((w) => w.id)) : Promise.resolve({ data: [] as { workbook_id: string; version: number }[] }),
  ]);
  const defs = await resolveTestDefs(client, (responses ?? []).map((r) => r.test_id));
  const who = new Map((patients ?? []).map((p) => [p.id, name(p)]));
  // Una ficha reenviada después de revisarla vuelve a la bandeja.
  const reviewedAt = new Map((reviews ?? []).map((r) => [`${r.item_type}:${r.item_id}`, r.reviewed_at]));
  const items: InboxItem[] = [];

  for (const r of responses ?? []) {
    if (reviewedAt.has(`test_response:${r.id}`)) continue;
    const test = defs.get(r.test_id)?.name ?? r.test_id;
    const person = who.get(r.patient_id) ?? "Paciente";
    items.push({
      key: `t-${r.id}`,
      kind: r.risk ? "risk" : "test",
      title: r.risk ? `Respuesta de riesgo en ${test} · ${person}` : `${test} respondido · ${person}`,
      detail: r.band_label ? `Resultado: ${r.band_label}` : "Ver el resultado",
      href: `/admin/pacientes/${r.patient_id}#tests-paciente`,
      at: r.completed_at,
      review: { itemType: "test_response", itemId: r.id },
    });
  }
  for (const i of intakes ?? []) {
    const seen = reviewedAt.get(`intake:${i.patient_id}`);
    if (seen && seen >= i.submitted_at!) continue;
    items.push({
      key: `i-${i.patient_id}`,
      kind: "intake",
      title: `Ficha de ingreso enviada · ${who.get(i.patient_id) ?? "Paciente"}`,
      detail: "Revisala antes de la primera sesión",
      href: `/admin/pacientes/${i.patient_id}/ingreso`,
      at: i.submitted_at!,
      review: { itemType: "intake", itemId: i.patient_id },
    });
  }
  for (const w of drafts ?? []) {
    const latest = Math.max(0, ...(versions ?? []).filter((v) => v.workbook_id === w.id).map((v) => v.version));
    if (latest === 0 || w.published_version === latest) continue;
    items.push({
      key: `w-${w.id}`,
      kind: "workbook",
      title: `${w.status === "draft" ? "Borrador de cuadernillo" : "Cambios sin publicar en el cuadernillo"} · ${who.get(w.patient_id) ?? "Paciente"}`,
      detail: "Revisalo y aprobalo para que lo vea el paciente",
      href: `/admin/pacientes/${w.patient_id}/cuadernillo`,
      at: w.updated_at,
    });
  }
  return items.sort((a, b) => ORDER[a.kind] - ORDER[b.kind] || b.at.localeCompare(a.at));
}
