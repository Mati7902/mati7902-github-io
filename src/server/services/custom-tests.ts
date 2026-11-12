import "server-only";

import { assignableTest } from "@/lib/clinical/focus";
import { customToTestDef } from "@/lib/guia/custom-tests";
import type { TestDef } from "@/lib/guia/types";
import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import type { ServerSupabaseClient } from "@/lib/supabase/server";

type AnyClient = ServerSupabaseClient | AdminSupabaseClient;

const isCustomCode = (id: string) => /^p[a-z0-9]{6,19}$/.test(id);

/**
 * Definición de un test asignable: los de uso libre de la guía o un test propio del profesional.
 * Con el cliente del paciente, RLS solo deja leer los tests propios que tiene asignados.
 */
export async function resolveTestDef(client: AnyClient, testId: string, opts: { requireActive?: boolean } = {}): Promise<TestDef | undefined> {
  const builtIn = assignableTest(testId);
  if (builtIn) return builtIn;
  if (!isCustomCode(testId)) return undefined;
  let q = client.from("custom_tests").select("*").eq("code", testId);
  if (opts.requireActive) q = q.eq("is_active", true);
  const { data } = await q.maybeSingle();
  return data ? customToTestDef(data) : undefined;
}

/** Varios a la vez (listas). */
export async function resolveTestDefs(client: AnyClient, ids: string[]): Promise<Map<string, TestDef>> {
  const out = new Map<string, TestDef>();
  const custom: string[] = [];
  for (const id of new Set(ids)) {
    const t = assignableTest(id);
    if (t) out.set(id, t);
    else if (isCustomCode(id)) custom.push(id);
  }
  if (custom.length) {
    const { data } = await client.from("custom_tests").select("*").in("code", custom);
    for (const row of data ?? []) out.set(row.code, customToTestDef(row));
  }
  return out;
}

/** Tests propios activos, para los selectores de asignación. */
export async function listActiveCustomTests(client: AnyClient): Promise<{ id: string; name: string; full: string }[]> {
  const { data } = await client.from("custom_tests").select("code, name, full_name").eq("is_active", true).order("name");
  return (data ?? []).map((t) => ({ id: t.code, name: t.name, full: t.full_name }));
}
