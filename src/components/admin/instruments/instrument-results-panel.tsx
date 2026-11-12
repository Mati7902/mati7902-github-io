"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCompactDate } from "@/lib/dates";
import { addInstrumentResultAction, deleteInstrumentResultAction } from "@/server/actions/instruments";

type Instrument = { id: string; short_name: string; name: string; score_min: number | null; score_max: number | null; higher_is: string | null };
type Result = { id: string; instrument_id: string; applied_on: string; score: number | null; interpretation: string | null; notes: string | null };

const selectClass = "h-11 w-full rounded-xl border border-input bg-card px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30";

/** Resultados de instrumentos con licencia: se cargan a mano y se ven en el tiempo. El paciente no los ve. */
export function InstrumentResultsPanel({ patientId, instruments, results, todayKey }: { patientId: string; instruments: Instrument[]; results: Result[]; todayKey: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [instrumentId, setInstrumentId] = useState("");
  const [appliedOn, setAppliedOn] = useState(todayKey);
  const [score, setScore] = useState("");
  const [interpretation, setInterpretation] = useState("");
  const [notes, setNotes] = useState("");
  const selected = instruments.find((i) => i.id === instrumentId);

  const add = () =>
    startTransition(async () => {
      const r = await addInstrumentResultAction({ patientId, instrumentId, appliedOn, score: score.trim() === "" ? null : Number(score), interpretation, notes });
      if (!r.ok) return void toast.error(r.fieldErrors ? (Object.values(r.fieldErrors)[0] ?? r.error) : r.error);
      toast.success("Resultado guardado.");
      setScore("");
      setInterpretation("");
      setNotes("");
      router.refresh();
    });

  const byInstrument = instruments.map((i) => ({ i, list: results.filter((r) => r.instrument_id === i.id).sort((a, b) => a.applied_on.localeCompare(b.applied_on)) })).filter((g) => g.list.length > 0);

  return (
    <div className="space-y-6">
      {byInstrument.map(({ i, list }) => {
        const series = list.filter((r) => r.score !== null).map((r) => ({ label: formatCompactDate(`${r.applied_on}T12:00:00`), score: r.score }));
        return (
          <div key={i.id} className="space-y-3 rounded-2xl border border-border/70 bg-card p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-medium">{i.short_name}</p>
              <p className="text-xs text-muted-foreground">{i.higher_is === "worse" ? "Más alto = más síntomas" : i.higher_is === "better" ? "Más alto = mejor" : ""}</p>
            </div>
            {series.length >= 2 ? (
              <div className="h-36 w-full" role="img" aria-label={`Evolución de ${i.short_name}`}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
                    <CartesianGrid stroke="var(--divider)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                    <YAxis domain={[i.score_min ?? "auto", i.score_max ?? "auto"]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="score" name="Puntaje" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 4, fill: "var(--card)", strokeWidth: 2 }} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : null}
            <ul className="space-y-1.5 text-sm">
              {[...list].reverse().map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-2">
                  <span className="text-muted-foreground">{formatCompactDate(`${r.applied_on}T12:00:00`)}</span>
                  {r.score !== null ? <span className="font-medium tabular-nums">{r.score}</span> : null}
                  {r.interpretation ? <span>{r.interpretation}</span> : null}
                  {r.notes ? <span className="basis-full text-muted-foreground">{r.notes}</span> : null}
                  <Button size="icon-sm" variant="ghost" className="ml-auto text-muted-foreground hover:text-destructive" aria-label="Eliminar resultado" onClick={() => startTransition(async () => { const x = await deleteInstrumentResultAction(r.id, patientId); if (!x.ok) toast.error(x.error); else router.refresh(); })}>
                    <Trash2 />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        );
      })}

      <div className="space-y-3">
        <h3 className="text-sm font-medium">Cargar un resultado</h3>
        <div className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr]">
          <select value={instrumentId} onChange={(e) => setInstrumentId(e.target.value)} className={selectClass} aria-label="Instrumento">
            <option value="">Elegí el instrumento…</option>
            {instruments.map((i) => (
              <option key={i.id} value={i.id}>{i.short_name} · {i.name}</option>
            ))}
          </select>
          <Input type="date" value={appliedOn} onChange={(e) => setAppliedOn(e.target.value)} aria-label="Fecha de aplicación" />
          <Input type="number" step="any" value={score} onChange={(e) => setScore(e.target.value)} placeholder={selected?.score_max !== null && selected?.score_max !== undefined ? `${selected.score_min ?? 0}–${selected.score_max}` : "Puntaje"} aria-label="Puntaje" />
        </div>
        <Input value={interpretation} onChange={(e) => setInterpretation(e.target.value)} maxLength={200} placeholder="Interpretación según el manual (ej.: «moderada»)" aria-label="Interpretación" />
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} placeholder="Observaciones (opcional)" aria-label="Observaciones" />
        <Button onClick={add} loading={pending} disabled={!instrumentId}>
          Guardar resultado
        </Button>
        <p className="text-xs text-muted-foreground">Solo vos ves estos resultados. Los instrumentos y sus licencias se administran en Instrumentos.</p>
      </div>
    </div>
  );
}
