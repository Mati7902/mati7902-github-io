"use client";

import { useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { formatCompactDate } from "@/lib/dates";
import { MOOD_MAX, MOOD_MIN, MOOD_RANGES, type MoodDay, type MoodRangeKey, average, lastDays, trendLine, weekComparison } from "@/lib/mood";
import { cn } from "@/lib/utils";

const fmt = (n: number | null) => (n === null ? "—" : n.toLocaleString("es-PY", { maximumFractionDigits: 1 }));

/**
 * Ánimo diario (promedio de cada día) con la recta de tendencia del período elegido.
 * Describe, no interpreta: sin diagnósticos ni mensajes que culpen por los días bajos.
 */
export function MoodTrendChart({ days, today, who = "patient" }: { days: MoodDay[]; today: string; who?: "patient" | "professional" }) {
  const [range, setRange] = useState<MoodRangeKey>("30");
  const span = MOOD_RANGES.find((r) => r.key === range)!.days;
  const visible = lastDays(days, span, today);
  const trend = trendLine(visible);
  const series = visible.map((d, i) => ({ ...d, label: formatCompactDate(`${d.day}T12:00:00`), trend: trend?.[i] ?? null }));
  const week = weekComparison(days, today);
  const avg = average(visible);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Período del gráfico" className="inline-flex rounded-full border border-border bg-muted/50 p-1">
          {MOOD_RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              aria-pressed={range === r.key}
              onClick={() => setRange(r.key)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                range === r.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
        <dl className="flex gap-5 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Esta semana</dt>
            <dd className="font-display text-xl font-semibold tabular-nums">{fmt(week.current)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Semana anterior</dt>
            <dd className="font-display text-xl font-semibold tabular-nums text-muted-foreground">{fmt(week.previous)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Promedio del período</dt>
            <dd className="font-display text-xl font-semibold tabular-nums text-muted-foreground">{fmt(avg)}</dd>
          </div>
        </dl>
      </div>

      {visible.length < 2 ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          {who === "patient"
            ? "Cuando registres tu ánimo al menos dos días en este período, vas a ver acá cómo va cambiando."
            : "Todavía no hay suficientes registros de ánimo en este período."}
        </p>
      ) : (
        <div className="h-60 w-full" role="img" aria-label={`Ánimo diario de los últimos ${span} días: promedio ${fmt(avg)} sobre ${MOOD_MAX}.`}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
              <CartesianGrid stroke="var(--divider)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} minTickGap={24} />
              <YAxis domain={[MOOD_MIN, MOOD_MAX]} ticks={[1, 4, 7, 10]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ stroke: "var(--border)" }}
                content={({ active, payload }) => {
                  const p = payload?.[0]?.payload as (typeof series)[number] | undefined;
                  if (!active || !p) return null;
                  return (
                    <div className="rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-[var(--shadow-float)]">
                      <p className="font-medium text-foreground">{p.label}</p>
                      <p className="text-muted-foreground">
                        Ánimo +{fmt(p.mood)}
                        {p.count > 1 ? ` (promedio de ${p.count} registros)` : ""}
                      </p>
                    </div>
                  );
                }}
              />
              {trend ? <Line type="linear" dataKey="trend" stroke="var(--muted-foreground)" strokeWidth={1.5} strokeDasharray="5 5" dot={false} activeDot={false} isAnimationActive={false} name="Tendencia" /> : null}
              <Line type="monotone" dataKey="mood" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 4, fill: "var(--card)", strokeWidth: 2 }} activeDot={{ r: 6 }} isAnimationActive={false} name="Ánimo" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      {trend ? (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-block h-0 w-5 border-t-2 border-dashed border-muted-foreground" aria-hidden /> Línea de tendencia del período
        </p>
      ) : null}
    </div>
  );
}
