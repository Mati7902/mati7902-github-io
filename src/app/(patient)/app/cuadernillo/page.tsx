import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Circle, Printer, Target } from "lucide-react";

import { exerciseHref } from "@/components/exercises/exercise-card";
import { Button } from "@/components/ui/button";
import { WorkbookChapters } from "@/components/workbook/workbook-chapters";
import { PageHeader } from "@/components/ui/page-header";
import { requirePatient } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getMyWorkbook } from "@/server/services/workbooks";

export const metadata: Metadata = { title: "Mi cuadernillo" };

export default async function MyWorkbookPage() {
  const { patient } = await requirePatient();
  const supabase = await createClient();
  const workbook = await getMyWorkbook(supabase);
  if (!workbook) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <PageHeader eyebrow="Ejercicios" title="Mi cuadernillo" />
        <p className="rounded-2xl bg-surface-muted px-4 py-3 text-muted-foreground">Tu psicólogo lo está preparando. Te avisamos cuando esté listo.</p>
      </div>
    );
  }
  const { content } = workbook;
  const slugs = content.items.map((i) => i.slug);
  const [{ data: templates }, { data: responses }, { data: answerRows }] = await Promise.all([
    supabase.from("exercise_templates").select("id, slug, kind").in("slug", slugs.length ? slugs : ["-"]),
    supabase.from("exercise_responses").select("template_id").eq("patient_id", patient.id).gte("completed_at", workbook.publishedAt),
    supabase.from("workbook_answers").select("prompt_key, answer").eq("workbook_id", workbook.workbookId),
  ]);
  const answers = Object.fromEntries((answerRows ?? []).map((a) => [a.prompt_key, a.answer]));
  const chapters = content.chapters ?? [];
  const bySlug = new Map((templates ?? []).map((t) => [t.slug, t]));
  const done = new Set((responses ?? []).map((r) => r.template_id));
  const completed = content.items.filter((i) => done.has(bySlug.get(i.slug)?.id ?? "")).length;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader eyebrow="Ejercicios" title={workbook.title} description={content.items.length ? `${completed} de ${content.items.length} actividades de la biblioteca hechas.` : undefined} />
      <p className="text-lg leading-relaxed text-muted-foreground">{content.welcome}</p>

      {content.goals.length ? (
        <section className="space-y-2" aria-labelledby="mis-objetivos">
          <h2 id="mis-objetivos" className="font-display text-xl font-medium">Lo que querés lograr</h2>
          <ul className="space-y-1.5">
            {content.goals.map((g) => (
              <li key={g} className="flex items-start gap-2">
                <Target className="mt-1 size-4 shrink-0 text-primary" aria-hidden /> {g}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {chapters.length ? <WorkbookChapters workbookId={workbook.workbookId} chapters={chapters} answers={answers} /> : null}

      {content.items.length ? (
      <section className="space-y-3" aria-labelledby="actividades">
        <h2 id="actividades" className="font-display text-xl font-medium">Ejercicios para practicar</h2>
        <ol className="space-y-3">
          {content.items.map((item, n) => {
            const t = bySlug.get(item.slug);
            const isDone = t ? done.has(t.id) : false;
            return (
              <li key={item.slug}>
                <Link href={t ? exerciseHref(t) : "/app/ejercicios"} className="surface-card flex items-start gap-3 p-4 transition-shadow hover:shadow-[var(--shadow-float)]">
                  {isDone ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" aria-label="Hecha" /> : <Circle className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-label="Pendiente" />}
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">
                      {n + 1}. {item.title}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {item.minutes ? `${item.minutes} min` : ""}
                      {item.note ? `${item.minutes ? " · " : ""}${item.note}` : ""}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </section>
      ) : null}

      <p className="text-muted-foreground">{content.closing}</p>
      <Button asChild variant="outline">
        <Link href="/app/cuadernillo/imprimir">
          <Printer aria-hidden /> Versión para imprimir
        </Link>
      </Button>
    </div>
  );
}
