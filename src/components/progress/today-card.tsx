import Link from "next/link";
import { ArrowRight, Pause, Play, Target } from "lucide-react";

import { Button } from "@/components/ui/button";
import { weekMessage, type ProgressSummary } from "@/lib/progress";
import type { TherapyGoal } from "@/types/domain";

import { WeekRing } from "./week-ring";

type Props = {
  summary: ProgressSummary;
  paused: boolean;
  goals: TherapyGoal[];
  suggestion: { href: string; title: string; minutes: number | null };
};

/** Tarjeta "Tu semana" del inicio: la próxima práctica a un toque, la meta y los objetivos. */
export function TodayCard({ summary, paused, goals, suggestion }: Props) {
  return (
    <section aria-labelledby="tu-semana" className="surface-card space-y-5 p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="tu-semana" className="font-display text-2xl font-medium">Tu semana</h2>
        <Link href="/app/progreso" className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-primary hover:underline">
          Mi progreso <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>

      {paused ? (
        <p className="flex items-center gap-2 rounded-2xl bg-surface-muted px-4 py-3 text-sm text-muted-foreground">
          <Pause className="size-4 shrink-0" aria-hidden /> Tus metas están en pausa. Practicá si querés: nada se pierde.
        </p>
      ) : (
        <div className="space-y-3">
          <WeekRing done={summary.thisWeek} goal={summary.weeklyGoal} days={summary.daysThisWeek} />
          <p className="text-muted-foreground" aria-live="polite">{weekMessage(summary)}</p>
        </div>
      )}

      <Button asChild size="lg" className="w-full sm:w-auto">
        <Link href={suggestion.href}>
          <Play aria-hidden /> Empezar: {suggestion.title}
          {suggestion.minutes ? ` · ${suggestion.minutes} min` : ""}
        </Link>
      </Button>

      {goals.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">Lo que estamos trabajando</p>
          <ul className="flex flex-wrap gap-2">
            {goals.slice(0, 4).map((g) => (
              <li key={g.id} className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background px-3 py-1.5 text-sm">
                <Target className="size-3.5 text-primary" aria-hidden /> {g.title}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
