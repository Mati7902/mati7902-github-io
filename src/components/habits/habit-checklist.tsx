"use client";

import { Check } from "lucide-react";
import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import type { Habit } from "@/lib/habits/data";
import { toggleHabitAction } from "@/server/actions/habits";

type Props = {
  habits: Habit[];
  /** "habitId|yyyy-MM-dd" de lo ya marcado. */
  done: string[];
  /** Hoy y los 3 días anteriores, del más viejo al más nuevo: { key, label }. */
  days: { key: string; label: string }[];
  /** Días de esta semana (lunes a hoy), para contar el avance semanal. */
  weekDays: string[];
};

/** Lista de hábitos: se marcan con un toque (hoy o hasta 3 días atrás). */
export function HabitChecklist({ habits, done, days, weekDays }: Props) {
  const [pending, startTransition] = useTransition();
  const [optimistic, toggle] = useOptimistic(new Set(done), (state, key: string) => {
    const next = new Set(state);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  });
  const today = days.at(-1)!.key;

  const flip = (habitId: string, day: string) => {
    const key = `${habitId}|${day}`;
    const willBeDone = !optimistic.has(key);
    startTransition(async () => {
      toggle(key);
      const r = await toggleHabitAction({ habitId, day, done: willBeDone });
      if (!r.ok) toast.error(r.error);
    });
  };

  return (
    <ul className="space-y-3">
      {habits.map((h) => {
        const weekCount = weekDays.filter((d) => optimistic.has(`${h.id}|${d}`)).length;
        const doneToday = optimistic.has(`${h.id}|${today}`);
        return (
          <li key={h.id} className="rounded-2xl border border-border/70 bg-card p-4">
            <div className="flex items-start gap-3">
              <button
                type="button"
                role="checkbox"
                aria-checked={doneToday}
                aria-label={`${h.title}: hecho hoy`}
                onClick={() => flip(h.id, today)}
                disabled={pending}
                className={cn(
                  "flex size-11 shrink-0 items-center justify-center rounded-xl border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  doneToday ? "border-success bg-success text-white" : "border-border bg-background hover:border-primary",
                )}
              >
                {doneToday ? <Check className="size-5" aria-hidden /> : null}
              </button>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{h.title}</p>
                <p className="text-sm text-muted-foreground">{h.detail}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className={cn("text-xs font-medium tabular-nums", weekCount >= h.perWeek ? "text-success" : "text-muted-foreground")}>
                    Esta semana: {weekCount} de {h.perWeek} días{weekCount >= h.perWeek ? " ✓" : ""}
                  </span>
                  <span className="text-xs text-muted-foreground">· ¿Te olvidaste de marcar?</span>
                  {days.slice(0, -1).map((d) => {
                    const on = optimistic.has(`${h.id}|${d.key}`);
                    return (
                      <button
                        key={d.key}
                        type="button"
                        role="checkbox"
                        aria-checked={on}
                        aria-label={`${h.title}: ${d.label}`}
                        onClick={() => flip(h.id, d.key)}
                        disabled={pending}
                        className={cn("min-h-8 rounded-lg border px-2 text-xs", on ? "border-success bg-success-soft text-foreground" : "border-border text-muted-foreground hover:border-primary/60")}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
