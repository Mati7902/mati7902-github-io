import "server-only";

import { parseSteps, type ExerciseStep } from "@/lib/exercises/steps";
import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import type { ServerSupabaseClient } from "@/lib/supabase/server";

/** Pasos de las plantillas del cuadernillo, para las hojas de trabajo del PDF. */
export async function stepsForSlugs(client: ServerSupabaseClient | AdminSupabaseClient, slugs: string[]): Promise<Record<string, ExerciseStep[]>> {
  if (slugs.length === 0) return {};
  const { data } = await client.from("exercise_templates").select("slug, steps").in("slug", slugs);
  return Object.fromEntries((data ?? []).map((t) => [t.slug, parseSteps(t.steps)]));
}
