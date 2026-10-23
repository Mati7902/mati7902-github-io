import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ClipboardCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { requirePatient } from "@/lib/auth/session";
import { assignableTest } from "@/lib/clinical/focus";
import { capitalize, formatCompactDate } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { listTestAssignments, listTestResponses } from "@/server/services/clinical";

export const metadata: Metadata = { title: "Mis cuestionarios" };

export default async function PatientTestsPage() {
  const { patient } = await requirePatient();
  const supabase = await createClient();
  // RLS: las respuestas solo llegan si el profesional habilitó ver el resultado.
  const [assignments, responses] = await Promise.all([listTestAssignments(supabase, patient.id), listTestResponses(supabase, patient.id)]);
  const pending = assignments.filter((a) => a.status === "pending" && assignableTest(a.test_id));
  const done = assignments.filter((a) => a.status === "completed");

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Entre sesiones" title="Mis cuestionarios" description="Cuestionarios breves que tu psicólogo te pidió completar. Ayudan a ver cómo vas a lo largo del tiempo." />
      {pending.length === 0 && done.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title="No tenés cuestionarios pendientes" description="Cuando tu psicólogo te pida completar uno, lo vas a ver acá y en tu inicio." />
      ) : null}
      {pending.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-display text-xl font-medium">Para completar</h2>
          <ul className="grid gap-3">
            {pending.map((a) => {
              const def = assignableTest(a.test_id)!;
              return (
                <li key={a.id}>
                  <Link href={`/app/tests/${a.id}`} className="surface-card group flex items-center gap-4 p-5 transition-shadow hover:shadow-[var(--shadow-float)]">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-mint-100 text-mint-700">
                      <ClipboardCheck className="size-5" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-display text-lg font-medium">{def.full}</span>
                      <span className="text-sm text-muted-foreground">
                        {def.items.length} preguntas · unos {Math.max(2, Math.round(def.items.length / 3))} minutos{a.due_on ? ` · antes del ${formatCompactDate(`${a.due_on}T12:00:00`)}` : ""}
                      </span>
                      {a.note ? <span className="mt-1 block text-sm text-foreground">{a.note}</span> : null}
                    </span>
                    <ArrowRight className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
      {done.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-display text-xl font-medium">Completados</h2>
          <ul className="space-y-2">
            {done.map((a) => {
              const r = responses.find((x) => x.assignment_id === a.id);
              const def = assignableTest(a.test_id);
              return (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border/70 bg-card px-4 py-3 text-sm">
                  <span className="font-medium">{def?.full ?? a.test_id}</span>
                  <span className="flex items-center gap-2 text-muted-foreground">
                    {a.completed_at ? capitalize(formatCompactDate(a.completed_at)) : null}
                    {r && r.score !== null ? <Badge variant="soft">Puntaje {r.score}{r.max_score ? ` de ${r.max_score}` : ""}</Badge> : null}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="text-xs text-muted-foreground">Los resultados los revisás con tu psicólogo en sesión. Un cuestionario no es un diagnóstico.</p>
        </section>
      ) : null}
    </div>
  );
}
