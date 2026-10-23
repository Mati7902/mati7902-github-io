"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AlertTriangle, X } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { formatCompactDate } from "@/lib/dates";
import { assignTestAction, cancelTestAction } from "@/server/actions/clinical";

export type TestRow = {
  id: string;
  testId: string;
  testName: string;
  status: string;
  assignedAt: string;
  dueOn: string | null;
  showResult: boolean;
  response: { score: number | null; max: number | null; band: string | null; level: string | null; summary: string | null; risk: boolean; completedAt: string } | null;
};

const LEVEL_BADGE: Record<string, "success" | "warning" | "destructive" | "muted"> = { ok: "success", warn: "warning", crit: "destructive", neu: "muted" };
const selectClass = "flex h-11 w-full rounded-xl border border-input bg-card px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30";

/** Tests del paciente: asignar uno suelto, ver los pendientes y la evolución de los respondidos. */
export function PatientTestsPanel({ patientId, rows, options }: { patientId: string; rows: TestRow[]; options: { id: string; name: string; full: string }[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [testId, setTestId] = useState("");
  const [dueOn, setDueOn] = useState("");
  const [showResult, setShowResult] = useState(false);

  const assign = () =>
    startTransition(async () => {
      const r = await assignTestAction({ patientId, testId, dueOn, showResult });
      if (!r.ok) return void toast.error(r.error);
      toast.success("Test asignado. El paciente lo ve en su inicio.");
      setTestId("");
      router.refresh();
    });
  const cancel = (id: string) =>
    startTransition(async () => {
      const r = await cancelTestAction(id, patientId);
      if (!r.ok) return void toast.error(r.error);
      router.refresh();
    });

  const pendingRows = rows.filter((r) => r.status === "pending");
  const done = rows.filter((r) => r.response);
  const byTest = new Map<string, TestRow[]>();
  for (const r of done) byTest.set(r.testId, [...(byTest.get(r.testId) ?? []), r]);

  return (
    <div className="space-y-6">
      {done.some((r) => r.response?.risk) ? (
        <p className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden /> Hay respuestas de riesgo en los tests de este paciente. Revisalas abajo.
        </p>
      ) : null}

      {pendingRows.length > 0 ? (
        <section className="space-y-2">
          <h3 className="text-sm font-medium">Pendientes de responder</h3>
          <ul className="space-y-2">
            {pendingRows.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-card px-3 py-2 text-sm">
                <span>
                  <span className="font-medium">{r.testName}</span> <span className="text-muted-foreground">· asignado {formatCompactDate(r.assignedAt)}{r.dueOn ? ` · para el ${formatCompactDate(`${r.dueOn}T12:00:00`)}` : ""}{r.showResult ? " · ve el resultado" : ""}</span>
                </span>
                <Button variant="ghost" size="icon" onClick={() => cancel(r.id)} disabled={pending} aria-label={`Cancelar ${r.testName}`}>
                  <X />
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {byTest.size > 0 ? (
        <section className="space-y-4">
          <h3 className="text-sm font-medium">Resultados</h3>
          {[...byTest.entries()].map(([id, list]) => {
            const last = list[list.length - 1]!;
            const series = list.filter((r) => r.response?.score !== null).map((r) => ({ label: formatCompactDate(r.response!.completedAt), score: r.response!.score }));
            return (
              <div key={id} className="space-y-3 rounded-2xl border border-border/70 bg-card p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium">{last.testName}</p>
                  <p className="text-xs text-muted-foreground">{list.length} aplicación{list.length === 1 ? "" : "es"}</p>
                </div>
                {series.length >= 2 ? (
                  <div className="h-40 w-full" role="img" aria-label={`Evolución del puntaje de ${last.testName}`}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
                        <CartesianGrid stroke="var(--divider)" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                        <YAxis domain={[0, last.response?.max ?? "auto"]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                        <Tooltip />
                        <Line type="monotone" dataKey="score" name="Puntaje" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 4, fill: "var(--card)", strokeWidth: 2 }} isAnimationActive={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : null}
                <ul className="space-y-1.5 text-sm">
                  {[...list].reverse().map((r) => (
                    <li key={r.id} className="flex flex-wrap items-center gap-2">
                      <span className="text-muted-foreground">{formatCompactDate(r.response!.completedAt)}</span>
                      {r.response!.risk ? <Badge variant="destructive">Riesgo</Badge> : null}
                      {r.response!.band ? <Badge variant={LEVEL_BADGE[r.response!.level ?? "neu"] ?? "muted"}>{r.response!.band}</Badge> : null}
                      <span className="basis-full text-foreground sm:basis-auto">{r.response!.summary}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </section>
      ) : null}

      <section className="space-y-3">
        <h3 className="text-sm font-medium">Asignar un test</h3>
        <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
          <select value={testId} onChange={(e) => setTestId(e.target.value)} className={selectClass} aria-label="Test">
            <option value="">Elegí un test…</option>
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name} · {o.full}
              </option>
            ))}
          </select>
          <Input type="date" value={dueOn} onChange={(e) => setDueOn(e.target.value)} aria-label="Fecha límite (opcional)" />
        </div>
        <label className="flex items-center gap-3 text-sm">
          <Switch checked={showResult} onCheckedChange={setShowResult} aria-label="Mostrar el resultado al paciente" /> Mostrar el resultado al paciente
        </label>
        <p className="text-xs text-muted-foreground">ASQ y Plutchik no se asignan para hacer en casa: aplicalos en sesión desde la Guía clínica.</p>
        <Button type="button" onClick={assign} disabled={!testId} loading={pending}>
          Asignar test
        </Button>
      </section>
    </div>
  );
}
