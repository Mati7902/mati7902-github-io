import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, ExternalLink } from "lucide-react";

import { ReadAloud } from "@/components/a11y/read-aloud";
import { RichText } from "@/components/exercises/rich-text";
import { Button } from "@/components/ui/button";
import { requirePatient } from "@/lib/auth/session";
import { pillarByKey } from "@/lib/habits/data";
import { nutritionAllowed } from "@/server/services/habits";

export async function generateMetadata({ params }: { params: Promise<{ pilar: string }> }): Promise<Metadata> {
  const p = pillarByKey((await params).pilar);
  return { title: p ? `${p.title}: por qué funciona` : "Hábitos" };
}

/** Artículo didáctico: qué dice la evidencia, por qué impacta en la salud mental y qué no promete. */
export default async function PillarArticlePage({ params }: { params: Promise<{ pilar: string }> }) {
  const { patient } = await requirePatient();
  const pillar = pillarByKey((await params).pilar);
  if (!pillar) notFound();
  const locked = pillar.key === "alimentacion" && !(await nutritionAllowed(patient.id).catch(() => true));

  return (
    <article className="mx-auto max-w-2xl space-y-8">
      <Link href="/app/habitos" className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> Hábitos
      </Link>
      <header className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-wider text-accent-strong">{pillar.title} y salud mental</p>
        <h1 className="font-display text-3xl font-medium text-balance sm:text-4xl">{pillar.tagline}</h1>
        <p className="text-lg leading-relaxed text-muted-foreground">{pillar.article.lead}</p>
        {!locked ? <ReadAloud label="Escuchar el artículo" text={[pillar.tagline, pillar.article.lead, ...pillar.article.sections.flatMap((s) => [s.title, s.body])].join("\n\n")} /> : null}
      </header>

      {locked ? (
        <p className="rounded-2xl bg-surface-muted px-4 py-3 text-muted-foreground">Este tema lo vamos a trabajar juntos en sesión, a tu medida.</p>
      ) : (
        <>
          {pillar.article.sections.map((s) => (
            <section key={s.title} className="space-y-3">
              <h2 className="font-display text-2xl font-medium">{s.title}</h2>
              <RichText text={s.body} className="text-base leading-relaxed text-foreground" />
            </section>
          ))}

          <section className="space-y-3 rounded-2xl border border-border/70 bg-card p-5">
            <h2 className="font-display text-xl font-medium">Tu rutina para empezar</h2>
            <ul className="space-y-2">
              {pillar.routine[0]!.habits.map((h) => (
                <li key={h.id}>
                  <span className="font-medium">{h.title}</span> <span className="text-muted-foreground">· {h.perWeek} días por semana. {h.detail}</span>
                </li>
              ))}
            </ul>
            <Button asChild>
              <Link href="/app/habitos">Ir a marcar mis hábitos</Link>
            </Button>
          </section>

          <p className="flex items-start gap-2 rounded-2xl bg-warning-soft px-4 py-3 text-sm">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning-strong" aria-hidden /> {pillar.safety}
          </p>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold">Para saber más (fuentes científicas)</h2>
            <ol className="list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
              {pillar.article.references.map((r) => (
                <li key={r.url}>
                  {r.text}{" "}
                  <a href={r.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-primary hover:underline">
                    Ver <ExternalLink className="size-3" aria-hidden />
                  </a>
                </li>
              ))}
            </ol>
          </section>
        </>
      )}
    </article>
  );
}
