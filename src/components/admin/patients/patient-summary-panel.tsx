import { AlertTriangle, BookOpen, ClipboardCheck, NotebookPen, Sparkles, type LucideIcon } from "lucide-react";

import { formatCompactDate } from "@/lib/dates";
import type { PatientSummary, TaskKind } from "@/lib/patient-summary";
import { cn } from "@/lib/utils";

const KIND: Record<TaskKind, { icon: LucideIcon; label: string }> = {
  ejercicio: { icon: Sparkles, label: "Ejercicio" },
  material: { icon: BookOpen, label: "Material" },
  test: { icon: ClipboardCheck, label: "Test" },
  cuadernillo: { icon: NotebookPen, label: "Cuadernillo" },
};

function Kpi({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "ok" | "warn" }) {
  return (
    <div className="rounded-xl bg-surface-muted px-4 py-3">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className={cn("mt-0.5 font-display text-2xl tabular-nums", tone === "warn" && "text-warning-strong", tone === "ok" && "text-mint-700")}>{value}</dd>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function TaskList({ items, empty }: { items: PatientSummary["done"]; empty: string }) {
  if (!items.length) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <ul className="grid gap-1.5">
      {items.slice(0, 10).map((t, i) => {
        const { icon: Icon, label } = KIND[t.kind];
        return (
          <li key={i} className="flex items-start gap-2 text-sm">
            <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-label={label} />
            <span className="min-w-0 flex-1">{t.title}</span>
            <span className={cn("shrink-0 text-xs tabular-nums", t.overdue ? "font-medium text-warning-strong" : "text-muted-foreground")}>
              {t.overdue ? "Vencida" : formatCompactDate(t.at)}
            </span>
          </li>
        );
      })}
      {items.length > 10 ? <li className="text-xs text-muted-foreground">y {items.length - 10} más</li> : null}
    </ul>
  );
}

/** Resumen del paciente: qué hizo (últimos 30 días), qué tiene pendiente e indicadores. */
export function PatientSummaryPanel({ s, shared }: { s: PatientSummary; shared: boolean }) {
  const moodTrend = s.mood?.recent != null && s.mood.previous != null ? (s.mood.recent - s.mood.previous >= 0 ? "↑" : "↓") : "";
  return (
    <section className="surface-card space-y-5 p-6" aria-labelledby="resumen-paciente">
      <div className="space-y-1">
        <h2 id="resumen-paciente" className="font-display text-lg font-medium">Resumen</h2>
        <p className="text-sm text-muted-foreground">Lo que hizo en los últimos 30 días, lo que tiene pendiente y cómo viene.</p>
      </div>

      {s.flags.length ? (
        <ul className="flex flex-wrap gap-2">
          {s.flags.map((f) => (
            <li key={f} className="flex items-center gap-1.5 rounded-full bg-warning-soft px-3 py-1 text-sm text-warning-strong">
              <AlertTriangle className="size-3.5" aria-hidden /> {f}
            </li>
          ))}
        </ul>
      ) : null}

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Cumplimiento" value={s.adherence === null ? "—" : `${s.adherence}%`} hint="de lo que le asignaste" tone={s.adherence === null ? undefined : s.adherence >= 60 ? "ok" : "warn"} />
        <Kpi label="Asistencia" value={s.sessions.attendance === null ? "—" : `${s.sessions.attendance}%`} hint={`${s.sessions.attended} sesiones · ${s.sessions.missed} ausencias (90 días)`} tone={s.sessions.missed >= 2 ? "warn" : undefined} />
        <Kpi
          label="Ánimo (14 días)"
          value={s.mood?.recent != null ? `${s.mood.recent} ${moodTrend}` : "—"}
          hint={!shared ? "No comparte registros" : s.mood?.previous != null ? `antes ${s.mood.previous} de 10` : "de 1 a 10"}
        />
        <Kpi
          label="Última actividad"
          value={s.daysSinceActivity === null ? "Nunca" : s.daysSinceActivity === 0 ? "Hoy" : `${s.daysSinceActivity} d`}
          hint={s.lastActivityAt ? formatCompactDate(s.lastActivityAt) : "no entró a la app"}
          tone={s.daysSinceActivity === null || s.daysSinceActivity >= 14 ? "warn" : undefined}
        />
      </dl>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Hizo · {s.done.length}</h3>
          <TaskList items={s.done} empty="Nada completado en los últimos 30 días." />
        </div>
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Pendiente · {s.pending.length}</h3>
          <TaskList items={s.pending} empty="No tiene nada pendiente." />
        </div>
      </div>
    </section>
  );
}
