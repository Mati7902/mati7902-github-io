import type { Metadata } from "next";
import Link from "next/link";
import { Award, Lock, Target } from "lucide-react";

import { ProgressPrefsForm } from "@/components/progress/progress-prefs-form";
import { WeekRing } from "@/components/progress/week-ring";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { requirePatient } from "@/lib/auth/session";
import { formatCompactDate, toDateKey } from "@/lib/dates";
import { ACTIVITY_LABEL, BADGES, challengeDef, weekMessage, type ActivityType } from "@/lib/progress";
import { createClient } from "@/lib/supabase/server";
import { getPatientProgress } from "@/server/services/progress";
import { getSettings } from "@/server/services/settings";

export const metadata: Metadata = { title: "Mi progreso" };

export default async function ProgressPage() {
  const { patient } = await requirePatient();
  const supabase = await createClient();
  const { scheduling, gamification } = await getSettings(supabase, ["scheduling", "gamification"] as const);
  const tz = scheduling.timezone;
  const progress = await getPatientProgress(supabase, patient.id, { tz, todayKey: toDateKey(new Date(), tz), globalEnabled: gamification.enabled });
  const { summary, goals, challenges, prefs, paused } = progress;

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <PageHeader eyebrow="Mi proceso" title="Mi progreso" description="Lo que practicaste entre sesiones. Es tuyo: nadie más lo compara ni lo ve en un ranking." />

      <section className="space-y-3" aria-labelledby="objetivos">
        <h2 id="objetivos" className="font-display text-xl font-medium">Objetivos que acordamos</h2>
        {goals.length === 0 ? (
          <p className="text-sm text-muted-foreground">Los vamos a definir juntos en sesión.</p>
        ) : (
          <ul className="space-y-2">
            {goals.map((g) => (
              <li key={g.id} className="flex items-start gap-3 rounded-2xl border border-border/70 bg-card p-4">
                <Target className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                <span>
                  <span className="font-medium">{g.title}</span>
                  {g.detail ? <span className="mt-1 block text-sm text-muted-foreground">{g.detail}</span> : null}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {!progress.enabled ? (
        <p className="flex items-start gap-2 rounded-2xl bg-surface-muted px-4 py-3 text-sm text-muted-foreground">
          <Lock className="mt-0.5 size-4 shrink-0" aria-hidden /> Las metas y los reconocimientos no están activos en tu proceso. Tus ejercicios y registros funcionan igual.
        </p>
      ) : (
        <>
          <section className="surface-card space-y-4 p-5 sm:p-6" aria-labelledby="semana">
            <h2 id="semana" className="font-display text-xl font-medium">Esta semana</h2>
            {paused ? (
              <p className="text-muted-foreground">Tus metas están en pausa{prefs.paused_until ? ` hasta el ${formatCompactDate(`${prefs.paused_until}T12:00:00`, tz)}` : ""}. Podés practicar igual.</p>
            ) : (
              <>
                <WeekRing done={summary.thisWeek} goal={summary.weeklyGoal} days={summary.daysThisWeek} />
                <p className="text-muted-foreground">{weekMessage(summary)}</p>
              </>
            )}
            <dl className="grid grid-cols-3 gap-3 border-t border-divider pt-4 text-center">
              <div>
                <dt className="text-xs text-muted-foreground">Prácticas</dt>
                <dd className="font-display text-2xl tabular-nums">{summary.total}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Semanas con la meta</dt>
                <dd className="font-display text-2xl tabular-nums">{summary.weeksMet}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Puntos de práctica</dt>
                <dd className="font-display text-2xl tabular-nums">{summary.points}</dd>
              </div>
            </dl>
            <p className="text-xs text-muted-foreground">Los puntos reconocen que practicaste, no cómo te sentiste. Cuentan hasta 5 prácticas por día (cada hábito de movimiento, descanso o alimentación, una vez por día).</p>
          </section>

          {challenges.length > 0 ? (
            <section className="space-y-3" aria-labelledby="desafios">
              <h2 id="desafios" className="font-display text-xl font-medium">Desafíos</h2>
              <ul className="space-y-3">
                {challenges.map((c) => {
                  const def = challengeDef(c.challenge);
                  const pct = Math.round((c.progress.done / c.progress.target) * 100);
                  return (
                    <li key={c.id} className="space-y-2 rounded-2xl border border-border/70 bg-card p-4">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="font-medium">{def?.title ?? c.challenge}</p>
                        <p className="text-sm tabular-nums text-muted-foreground">
                          {c.progress.done} de {c.progress.target} días
                        </p>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-surface-muted" role="progressbar" aria-valuenow={c.progress.done} aria-valuemin={0} aria-valuemax={c.progress.target} aria-label={def?.title}>
                        <div className={`h-full rounded-full ${c.progress.completed ? "bg-success" : "bg-primary"}`} style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {c.progress.completed ? "¡Completado! " : ""}
                        {c.note || def?.detail} {c.progress.ended ? "Terminó el plazo: lo que hiciste cuenta igual." : `Hasta el ${formatCompactDate(`${c.progress.endsOn}T12:00:00`, tz)}.`}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          {prefs.badges_enabled ? (
            <section className="space-y-3" aria-labelledby="insignias">
              <h2 id="insignias" className="font-display text-xl font-medium">Insignias</h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {BADGES.map((b) => {
                  const earned = summary.badges.includes(b.key);
                  return (
                    <li key={b.key} className={`flex items-start gap-3 rounded-2xl border p-4 ${earned ? "border-success/40 bg-success-soft/50" : "border-dashed border-border/70 opacity-70"}`}>
                      <Award className={`mt-0.5 size-5 shrink-0 ${earned ? "text-mint-700" : "text-muted-foreground"}`} aria-hidden />
                      <span>
                        <span className="font-medium">{b.title}</span>
                        <span className="sr-only">{earned ? " (obtenida)" : " (todavía no)"}</span>
                        <span className="block text-sm text-muted-foreground">{b.detail}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          <section className="space-y-3" aria-labelledby="practica-por-tipo">
            <h2 id="practica-por-tipo" className="font-display text-xl font-medium">Qué practicaste</h2>
            <ul className="divide-y divide-divider rounded-2xl border border-border/70 bg-card text-sm">
              {(Object.keys(ACTIVITY_LABEL) as ActivityType[])
                .filter((t) => summary.byType[t] > 0)
                .map((t) => (
                  <li key={t} className="flex justify-between px-4 py-3">
                    <span>{ACTIVITY_LABEL[t]}</span>
                    <span className="tabular-nums text-muted-foreground">{summary.byType[t]}</span>
                  </li>
                ))}
              {summary.total === 0 ? <li className="px-4 py-3 text-muted-foreground">Todavía no hay prácticas. La primera puede durar 3 minutos.</li> : null}
            </ul>
          </section>

          <section className="space-y-3" aria-labelledby="ajustes">
            <h2 id="ajustes" className="font-display text-xl font-medium">Ajustes</h2>
            <ProgressPrefsForm weeklyGoal={prefs.weekly_goal} badgesEnabled={prefs.badges_enabled} paused={paused} />
          </section>
        </>
      )}

      <Button asChild variant="outline">
        <Link href="/app/ejercicios">Ir a mis ejercicios</Link>
      </Button>
    </div>
  );
}
