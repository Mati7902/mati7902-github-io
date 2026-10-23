import "server-only";

import { fromDatabaseError } from "@/lib/errors";
import type { ServerSupabaseClient } from "@/lib/supabase/server";
import type { EmotionalLog } from "@/types/domain";

export type EmotionalLogInput = {
  emotions: string[];
  /** Solo si hay emociones. */
  intensity: number | null;
  /** Ánimo general 1–10 (opcional). */
  mood?: number | null;
  situation?: string | null;
  thought?: string | null;
  behavior?: string | null;
  need?: string | null;
  loggedAt?: Date;
};

export async function createEmotionalLog(client: ServerSupabaseClient, patientId: string, input: EmotionalLogInput): Promise<EmotionalLog> {
  const { data, error } = await client
    .from("emotional_logs")
    .insert({
      patient_id: patientId,
      emotions: input.emotions,
      intensity: input.emotions.length > 0 ? input.intensity : null,
      mood: input.mood ?? null,
      situation: input.situation ?? null,
      thought: input.thought ?? null,
      behavior: input.behavior ?? null,
      need: input.need ?? null,
      logged_at: (input.loggedAt ?? new Date()).toISOString(),
    })
    .select("*")
    .single();
  if (error) throw fromDatabaseError(error, "No pudimos guardar el registro.");
  return data;
}

export async function listEmotionalLogs(client: ServerSupabaseClient, patientId: string, limit = 120): Promise<EmotionalLog[]> {
  const { data } = await client
    .from("emotional_logs")
    .select("*")
    .eq("patient_id", patientId)
    .order("logged_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function deleteEmotionalLog(client: ServerSupabaseClient, patientId: string, id: string) {
  const { error } = await client.from("emotional_logs").delete().eq("id", id).eq("patient_id", patientId);
  if (error) throw fromDatabaseError(error);
}

export type MoodPoint = { date: string; intensity: number; emotions: string[] };

/** Registros con ánimo de los últimos `days` días (para los gráficos). */
export async function listMoodEntries(client: ServerSupabaseClient, patientId: string, days = 90): Promise<{ logged_at: string; mood: number | null }[]> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const { data } = await client
    .from("emotional_logs")
    .select("logged_at, mood")
    .eq("patient_id", patientId)
    .not("mood", "is", null)
    .gte("logged_at", since)
    .order("logged_at", { ascending: true });
  return data ?? [];
}

/** Serie simple para el gráfico de evolución (sin interpretación clínica). */
export function toMoodSeries(logs: EmotionalLog[]): MoodPoint[] {
  return [...logs]
    .sort((a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime())
    .filter((l) => l.intensity !== null)
    .map((l) => ({ date: l.logged_at, intensity: l.intensity as number, emotions: l.emotions }));
}

export function emotionFrequency(logs: EmotionalLog[]): { key: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const log of logs) for (const e of log.emotions) counts.set(e, (counts.get(e) ?? 0) + 1);
  return [...counts.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count);
}
