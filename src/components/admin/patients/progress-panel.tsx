"use client";

import { Check, Pencil, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CHALLENGES, challengeDef } from "@/lib/progress";
import { assignChallengeAction, cancelChallengeAction, deleteGoalAction, saveGoalAction, setPatientProgressAction } from "@/server/actions/progress";
import type { TherapyGoal } from "@/types/domain";

const selectClass = "h-11 w-full rounded-xl border border-input bg-card px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30";
const GOAL_STATUS: Record<string, string> = { active: "En curso", achieved: "Logrado", paused: "En pausa" };

type Challenge = { id: string; challenge: string; done: number; target: number; endsOn: string; completed: boolean; ended: boolean };

type Props = {
  patientId: string;
  goals: TherapyGoal[];
  challenges: Challenge[];
  /** null = regla por defecto. */
  professionalEnabled: boolean | null;
  effectiveEnabled: boolean;
  /** Resumen de participación; null si el paciente no comparte sus registros. */
  participation: { total: number; thisWeek: number; weeklyGoal: number; weeksMet: number; paused: boolean } | null;
};

/** Objetivos, desafíos y Mi Progreso del paciente. La participación se muestra aparte de la evolución clínica. */
export function ProgressPanel({ patientId, goals, challenges, professionalEnabled, effectiveEnabled, participation }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [challenge, setChallenge] = useState("");
  const [days, setDays] = useState<3 | 7 | 14 | 30>(7);
  const [target, setTarget] = useState(5);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, msg?: string) =>
    startTransition(async () => {
      const r = await fn();
      if (!r.ok) return void toast.error((r as { error: string }).error);
      if (msg) toast.success(msg);
      router.refresh();
    });

  return (
    <div className="space-y-7">
      <section className="space-y-3">
        <h3 className="text-sm font-medium">Objetivos terapéuticos</h3>
        <ul className="space-y-2">
          {goals.map((g) => (
            <li key={g.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-card px-3 py-2 text-sm">
              {editing === g.id ? (
                <>
                  <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} maxLength={160} className="h-10 min-w-0 flex-1" aria-label="Objetivo" />
                  <Button size="icon-sm" variant="ghost" aria-label="Guardar" onClick={() => { run(() => saveGoalAction({ patientId, id: g.id, title: editTitle, detail: g.detail, status: g.status as "active" }), "Objetivo guardado."); setEditing(null); }}>
                    <Check />
                  </Button>
                  <Button size="icon-sm" variant="ghost" aria-label="Cancelar" onClick={() => setEditing(null)}>
                    <X />
                  </Button>
                </>
              ) : (
                <>
                  <span className={`min-w-0 flex-1 ${g.status === "achieved" ? "text-muted-foreground line-through" : ""}`}>{g.title}</span>
                  <select
                    value={g.status}
                    onChange={(e) => run(() => saveGoalAction({ patientId, id: g.id, title: g.title, detail: g.detail, status: e.target.value as "active" }))}
                    className="h-9 rounded-lg border border-input bg-card px-2 text-sm"
                    aria-label={`Estado de ${g.title}`}
                    disabled={pending}
                  >
                    {Object.entries(GOAL_STATUS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                  <Button size="icon-sm" variant="ghost" aria-label={`Editar ${g.title}`} onClick={() => { setEditing(g.id); setEditTitle(g.title); }}>
                    <Pencil />
                  </Button>
                  <Button size="icon-sm" variant="ghost" className="text-muted-foreground hover:text-destructive" aria-label={`Eliminar ${g.title}`} onClick={() => run(() => deleteGoalAction(g.id, patientId))} disabled={pending}>
                    <Trash2 />
                  </Button>
                </>
              )}
            </li>
          ))}
        </ul>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => saveGoalAction({ patientId, title }), "Objetivo agregado. El paciente lo ve en su inicio.");
            setTitle("");
          }}
        >
          <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} placeholder="Ej.: dormir al menos 6 horas la mayoría de las noches" aria-label="Nuevo objetivo" className="min-w-0 flex-1" />
          <Button type="submit" disabled={pending || title.trim().length < 2}>
            Agregar
          </Button>
        </form>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-medium">Mi Progreso (metas, puntos e insignias)</h3>
          <select
            value={professionalEnabled === null ? "auto" : professionalEnabled ? "on" : "off"}
            onChange={(e) => run(() => setPatientProgressAction(patientId, e.target.value === "auto" ? null : e.target.value === "on"), "Guardado.")}
            className="h-9 rounded-lg border border-input bg-card px-2 text-sm"
            aria-label="Mi Progreso para este paciente"
            disabled={pending}
          >
            <option value="auto">Automático ({effectiveEnabled ? "activo" : "apagado"})</option>
            <option value="on">Activado</option>
            <option value="off">Apagado</option>
          </select>
        </div>
        <p className="text-xs text-muted-foreground">Automático: activo salvo en TOC y conducta alimentaria, donde contar conductas puede reforzar síntomas.</p>
        {participation ? (
          <p className="rounded-xl bg-surface-muted px-3 py-2 text-sm">
            {participation.paused ? "Metas en pausa. " : `Esta semana: ${participation.thisWeek} de ${participation.weeklyGoal}. `}
            {participation.total} prácticas en total · {participation.weeksMet} {participation.weeksMet === 1 ? "semana" : "semanas"} con la meta cumplida.
            <span className="block text-xs text-muted-foreground">Participación, no evolución clínica.</span>
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">El paciente no comparte sus registros: no se muestra su participación.</p>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-medium">Desafíos</h3>
        {challenges.length > 0 ? (
          <ul className="space-y-2">
            {challenges.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-card px-3 py-2 text-sm">
                <span>
                  <span className="font-medium">{challengeDef(c.challenge)?.title ?? c.challenge}</span>{" "}
                  <span className="text-muted-foreground">
                    · {c.done}/{c.target} días{c.completed ? " · completado" : c.ended ? " · terminó" : ` · hasta ${c.endsOn.split("-").reverse().slice(0, 2).join("/")}`}
                  </span>
                </span>
                <Button size="icon-sm" variant="ghost" aria-label="Cancelar desafío" onClick={() => run(() => cancelChallengeAction(c.id, patientId))} disabled={pending}>
                  <X />
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr_auto]">
          <select value={challenge} onChange={(e) => setChallenge(e.target.value)} className={selectClass} aria-label="Desafío">
            <option value="">Elegí un desafío…</option>
            {CHALLENGES.map((c) => (
              <option key={c.key} value={c.key}>{c.title}</option>
            ))}
          </select>
          <select value={days} onChange={(e) => { const d = Number(e.target.value) as 3 | 7 | 14 | 30; setDays(d); setTarget(Math.min(target, d)); }} className={selectClass} aria-label="Duración">
            {[3, 7, 14, 30].map((d) => (
              <option key={d} value={d}>{d} días</option>
            ))}
          </select>
          <select value={target} onChange={(e) => setTarget(Number(e.target.value))} className={selectClass} aria-label="Días a completar">
            {Array.from({ length: days }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>meta {n}</option>
            ))}
          </select>
          <Button type="button" disabled={pending || !challenge} onClick={() => run(() => assignChallengeAction({ patientId, challenge, days, target }), "Desafío habilitado. Empieza hoy.")}>
            Habilitar
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Meta = cuántos días con práctica dentro del plazo. Una meta menor que los días deja margen para descansar.</p>
      </section>
    </div>
  );
}
