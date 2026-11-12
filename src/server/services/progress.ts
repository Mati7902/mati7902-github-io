import "server-only";

import { fromDatabaseError } from "@/lib/errors";
import { challengeProgress, exerciseActivityType, summarize, type ChallengeProgress, type PracticeEvent, type ProgressSummary } from "@/lib/progress";
import { createAdminClient, type AdminSupabaseClient } from "@/lib/supabase/admin";
import type { ServerSupabaseClient } from "@/lib/supabase/server";
import type { ProgressChallenge, ProgressPrefs, TherapyGoal } from "@/types/domain";

type AnyClient = ServerSupabaseClient | AdminSupabaseClient;

/** Cuadros en los que Mi Progreso arranca apagado hasta que el profesional lo active. */
const CAUTION_FOCI = ["toc", "alimentacion"];

export const DEFAULT_PREFS = { weekly_goal: 3, paused_until: null, badges_enabled: true, professional_enabled: null } as const;

/**
 * Prácticas del paciente (ejercicios y registros emocionales). Con el cliente del profesional,
 * RLS solo devuelve algo si el paciente comparte sus registros.
 */
export async function loadPracticeEvents(client: AnyClient, patientId: string, sinceDays = 400): Promise<PracticeEvent[]> {
  const since = new Date(Date.now() - sinceDays * 24 * 3600_000).toISOString();
  const [{ data: responses, error: e1 }, { data: logs, error: e2 }] = await Promise.all([
    client.from("exercise_responses").select("completed_at, exercise_templates(kind, approach)").eq("patient_id", patientId).gte("completed_at", since),
    client.from("emotional_logs").select("logged_at").eq("patient_id", patientId).gte("logged_at", since),
  ]);
  if (e1) throw fromDatabaseError(e1);
  if (e2) throw fromDatabaseError(e2);
  return [
    ...(responses ?? []).map((r) => {
      const t = r.exercise_templates as { kind: string; approach: string } | null;
      return { at: r.completed_at, type: exerciseActivityType(t?.kind ?? "custom", t?.approach ?? "general") };
    }),
    ...(logs ?? []).map((l) => ({ at: l.logged_at, type: "registro" as const })),
  ];
}

export async function getProgressPrefs(client: AnyClient, patientId: string): Promise<Pick<ProgressPrefs, "weekly_goal" | "paused_until" | "badges_enabled" | "professional_enabled">> {
  const { data } = await client.from("progress_prefs").select("weekly_goal, paused_until, badges_enabled, professional_enabled").eq("patient_id", patientId).maybeSingle();
  return data ?? { ...DEFAULT_PREFS };
}

/**
 * ¿Está activo Mi Progreso para este paciente? Lo decide el profesional; si no decidió, se apaga
 * en TOC y conducta alimentaria (donde contar o puntuar conductas puede reforzar síntomas).
 * El diagnóstico se lee con el cliente admin: el paciente nunca lo ve.
 */
export async function progressEnabledFor(patientId: string, prefs: Pick<ProgressPrefs, "professional_enabled">, globalEnabled: boolean): Promise<boolean> {
  if (!globalEnabled) return false;
  if (prefs.professional_enabled !== null) return prefs.professional_enabled;
  const { data } = await createAdminClient().from("patient_clinical_focus").select("focus_key").eq("patient_id", patientId);
  return !(data ?? []).some((f) => CAUTION_FOCI.includes(f.focus_key));
}

export function isPaused(prefs: Pick<ProgressPrefs, "paused_until">, todayKey: string): boolean {
  return Boolean(prefs.paused_until && prefs.paused_until >= todayKey);
}

export async function listGoals(client: AnyClient, patientId: string, includeAll = false): Promise<TherapyGoal[]> {
  let q = client.from("therapy_goals").select("*").eq("patient_id", patientId).order("sort_order").order("created_at");
  if (!includeAll) q = q.eq("status", "active");
  const { data, error } = await q;
  if (error) throw fromDatabaseError(error);
  return data ?? [];
}

export type ChallengeWithProgress = ProgressChallenge & { progress: ChallengeProgress };

export async function listChallenges(client: AnyClient, patientId: string, events: PracticeEvent[], tz: string): Promise<ChallengeWithProgress[]> {
  const { data, error } = await client.from("progress_challenges").select("*").eq("patient_id", patientId).eq("status", "active").order("starts_on", { ascending: false }).limit(10);
  if (error) throw fromDatabaseError(error);
  return (data ?? []).map((c) => ({ ...c, progress: challengeProgress(c, events, tz) }));
}

export type PatientProgress = {
  enabled: boolean;
  paused: boolean;
  prefs: Awaited<ReturnType<typeof getProgressPrefs>>;
  summary: ProgressSummary;
  goals: TherapyGoal[];
  challenges: ChallengeWithProgress[];
};

/** Todo lo que necesita la pantalla del paciente. */
export async function getPatientProgress(client: ServerSupabaseClient, patientId: string, opts: { tz: string; todayKey: string; globalEnabled: boolean }): Promise<PatientProgress> {
  const [prefs, events, goals] = await Promise.all([getProgressPrefs(client, patientId), loadPracticeEvents(client, patientId), listGoals(client, patientId)]);
  const [enabled, challenges] = await Promise.all([progressEnabledFor(patientId, prefs, opts.globalEnabled), listChallenges(client, patientId, events, opts.tz)]);
  return {
    enabled,
    paused: isPaused(prefs, opts.todayKey),
    prefs,
    summary: summarize(events, { weeklyGoal: prefs.weekly_goal, tz: opts.tz }),
    goals,
    challenges,
  };
}

/** Siguiente práctica sugerida: lo que asignó el profesional primero; si no hay, una respiración breve. */
export async function nextSuggestedPractice(client: AnyClient, patientId: string): Promise<{ href: string; title: string; minutes: number | null }> {
  const { data } = await client
    .from("exercise_assignments")
    .select("assigned_at, exercise_templates(slug, title, estimated_minutes)")
    .eq("patient_id", patientId)
    .is("completed_at", null)
    .order("assigned_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  const t = data?.exercise_templates as { slug: string; title: string; estimated_minutes: number | null } | null | undefined;
  if (t) return { href: `/app/ejercicios/${t.slug}`, title: t.title, minutes: t.estimated_minutes };
  return { href: "/app/calmarme/respiracion/respiracion-diafragmatica", title: "Respiración guiada", minutes: 3 };
}
