"use client";

import { cn } from "@/lib/utils";
import { MOOD_MAX, MOOD_MIN } from "@/lib/mood";

const VALUES = Array.from({ length: MOOD_MAX - MOOD_MIN + 1 }, (_, i) => MOOD_MIN + i);

/** Ánimo general como insignias de +1 a +10. Radio group accesible: flechas para moverse. */
export function MoodScale({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  const move = (group: HTMLElement, delta: number) => {
    const next = Math.min(MOOD_MAX, Math.max(MOOD_MIN, (value ?? MOOD_MIN - (delta > 0 ? 1 : -1)) + delta));
    onChange(next);
    group.querySelector<HTMLButtonElement>(`[data-mood="${next}"]`)?.focus();
  };
  return (
    <div className="space-y-3">
      <div
        role="radiogroup"
        aria-label="Ánimo de 1 (muy bajo) a 10 (muy bien)"
        className="grid grid-cols-5 gap-2.5 sm:gap-3"
        onKeyDown={(e) => {
          if (e.key === "ArrowRight" || e.key === "ArrowUp") {
            e.preventDefault();
            move(e.currentTarget, 1);
          } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
            e.preventDefault();
            move(e.currentTarget, -1);
          }
        }}
      >
        {VALUES.map((v) => {
          const selected = value === v;
          return (
            <button
              key={v}
              type="button"
              data-mood={v}
              role="radio"
              aria-checked={selected}
              aria-label={`${v} de ${MOOD_MAX}`}
              tabIndex={selected || (value === null && v === MOOD_MIN) ? 0 : -1}
              onClick={() => onChange(v)}
              className={cn(
                "group relative flex aspect-square min-h-12 items-center justify-center rounded-full border-2 font-display text-lg font-semibold tabular-nums transition-all",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                selected
                  ? "scale-105 border-primary bg-primary text-primary-foreground shadow-[var(--shadow-float)]"
                  : "border-border bg-card text-foreground hover:border-primary/60 hover:bg-muted",
              )}
            >
              <span className={cn("absolute inset-1 rounded-full border border-dashed", selected ? "border-primary-foreground/40" : "border-transparent group-hover:border-primary/30")} aria-hidden />
              +{v}
            </button>
          );
        })}
      </div>
      <div className="flex justify-between text-xs text-subtle-foreground">
        <span>+1 · muy bajo</span>
        <span>+10 · muy bien</span>
      </div>
    </div>
  );
}
