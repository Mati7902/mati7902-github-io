import "server-only";

import { addDays } from "date-fns";

import { toDateKey } from "@/lib/dates";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ServerSupabaseClient } from "@/lib/supabase/server";

/** Hábitos marcados en los últimos 14 días (para la semana actual y los últimos días). */
export async function listRecentHabitLogs(client: ServerSupabaseClient, patientId: string, tz: string): Promise<{ habit_id: string; logged_on: string }[]> {
  const since = toDateKey(addDays(new Date(), -14), tz);
  const { data } = await client.from("habit_logs").select("habit_id, logged_on").eq("patient_id", patientId).gte("logged_on", since);
  return data ?? [];
}

/**
 * La alimentación no se propone a pacientes con conducta alimentaria como foco clínico: contar
 * comidas puede reforzar síntomas. El diagnóstico se lee con el cliente admin (el paciente no lo ve).
 */
export async function nutritionAllowed(patientId: string): Promise<boolean> {
  const { data } = await createAdminClient().from("patient_clinical_focus").select("focus_key").eq("patient_id", patientId).eq("focus_key", "alimentacion");
  return (data ?? []).length === 0;
}
