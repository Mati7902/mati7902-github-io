import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, Lock } from "lucide-react";

import { HabitChecklist } from "@/components/habits/habit-checklist";
import { PageHeader } from "@/components/ui/page-header";
import { requirePatient } from "@/lib/auth/session";
import { PILLARS } from "@/lib/habits/data";
import { habitDays } from "@/lib/habits/days";
import { createClient } from "@/lib/supabase/server";
import { listRecentHabitLogs, nutritionAllowed } from "@/server/services/habits";
import { getSetting } from "@/server/services/settings";

export const metadata: Metadata = { title: "Hábitos" };

export default async function HabitsPage() {
  const { patient } = await requirePatient();
  const supabase = await createClient();
  const { timezone } = await getSetting(supabase, "scheduling");
  const [logs, nutritionOk] = await Promise.all([listRecentHabitLogs(supabase, patient.id, timezone).catch(() => []), nutritionAllowed(patient.id).catch(() => true)]);
  const { days, weekDays } = habitDays(timezone);
  const done = logs.map((l) => `${l.habit_id}|${l.logged_on}`);

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <PageHeader
        eyebrow="Cuidarme"
        title="Hábitos que cuidan tu mente"
        description="Moverte, dormir bien y comer con regularidad tienen respaldo científico para mejorar el ánimo y la ansiedad. Empezá por lo chico: cada hábito que marcás suma en tu progreso."
      />

      {PILLARS.map((p) => {
        const locked = p.key === "alimentacion" && !nutritionOk;
        return (
          <section key={p.key} aria-labelledby={`pilar-${p.key}`} className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 id={`pilar-${p.key}`} className="font-display text-2xl font-medium">{p.title}</h2>
                <p className="text-muted-foreground">{p.tagline}</p>
              </div>
              <Link href={`/app/habitos/${p.key}`} className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                <BookOpen className="size-4" aria-hidden /> Por qué funciona <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
            {locked ? (
              <p className="flex items-start gap-2 rounded-2xl bg-surface-muted px-4 py-3 text-sm text-muted-foreground">
                <Lock className="mt-0.5 size-4 shrink-0" aria-hidden /> La alimentación la trabajamos juntos en sesión, a tu medida.
              </p>
            ) : (
              p.routine.map((r, i) =>
                i === 0 ? (
                  <div key={r.level} className="space-y-2">
                    <p className="text-sm font-medium">
                      {r.level} <span className="font-normal text-muted-foreground">· {r.description}</span>
                    </p>
                    <HabitChecklist habits={r.habits} done={done} days={days} weekDays={weekDays} />
                  </div>
                ) : (
                  <details key={r.level} className="group space-y-2">
                    <summary className="cursor-pointer text-sm font-medium">
                      {r.level} <span className="font-normal text-muted-foreground">· {r.description}</span>
                    </summary>
                    <div className="pt-2">
                      <HabitChecklist habits={r.habits} done={done} days={days} weekDays={weekDays} />
                    </div>
                  </details>
                ),
              )
            )}
          </section>
        );
      })}

      <p className="text-xs text-muted-foreground">
        Es información general basada en evidencia, no una indicación médica ni nutricional personal. Cada hábito cuenta una vez por día en <Link href="/app/progreso" className="underline">Mi progreso</Link>.
      </p>
    </div>
  );
}
