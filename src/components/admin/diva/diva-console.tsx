"use client";

import { Copy, RotateCcw, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { divaText, divaVerdict, freshState, presOf, scoreDiva, toggleExample, type DivaContent, type DivaItem, type DivaState, type Period, type PeriodState, type Tri } from "@/lib/diva";
import { cn } from "@/lib/utils";
import { saveDivaResultAction } from "@/server/actions/instruments";

type Part = "A" | "H" | "F";

function Seg<T extends string>({ value, options, onChange, label }: { value: T | null; options: [T, string][]; onChange: (v: T | null) => void; label: string }) {
  return (
    <span className="inline-flex gap-1" role="group" aria-label={label}>
      {options.map(([v, l]) => (
        <button
          key={v}
          type="button"
          aria-pressed={value === v}
          onClick={() => onChange(value === v ? null : v)}
          className={cn("min-h-9 rounded-lg border px-3 text-sm font-medium tabular-nums", value === v ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/60")}
        >
          {l}
        </button>
      ))}
    </span>
  );
}

const pill = (x: boolean | null) => (x === true ? "bg-success-soft text-mint-700" : x === false ? "bg-muted text-muted-foreground" : "bg-warning-soft text-warning-strong");

/**
 * Consola DIVA-5: el profesional la completa en sesión. Calcula los criterios en vivo y arma el
 * texto para el HIS. Nada se guarda hasta tocar «Guardar en la ficha».
 */
export function DivaConsole({ content, patientId, patientName, todayKey }: { content: DivaContent; patientId: string; patientName: string; todayKey: string }) {
  const router = useRouter();
  const [st, setSt] = useState<DivaState>(() => freshState(content));
  const [part, setPart] = useState<Part>("A");
  const [edited, setEdited] = useState<string | null>(null);
  const [appliedOn, setAppliedOn] = useState(todayKey);
  const [confirmClear, setConfirmClear] = useState(false);
  const [pending, startTransition] = useTransition();

  const r = useMemo(() => scoreDiva(content, st), [content, st]);
  const v = useMemo(() => divaVerdict(r, st), [r, st]);
  const auto = useMemo(() => divaText(content, st, r, v), [content, st, r, v]);
  const text = edited ?? auto;

  const setPeriod = (id: string, p: Period, fn: (s: PeriodState) => PeriodState) =>
    setSt((x) => ({ ...x, items: { ...x.items, [id]: { ...x.items[id]!, [p]: fn(x.items[id]![p]) } } }));
  const toggleArea = (p: Period, k: number, i: number, on: boolean) =>
    setSt((x) => {
      const areas = { ...x.areas, [p]: x.areas[p].map((set, kk) => (kk === k ? (on ? [...new Set([...set, i])] : set.filter((n) => n !== i)) : set)) };
      return { ...x, areas };
    });

  const save = () =>
    startTransition(async () => {
      const res = await saveDivaResultAction({
        patientId,
        appliedOn,
        interpretation: (v.cls === "ok" ? `${v.title}${v.code ? ` · CIE-10 ${v.code}` : ""}` : v.title).slice(0, 200),
        notes: `Inatención ${r.Aa.n}/9 adulto, ${r.Ac.n}/9 infancia · Hiperactividad-impulsividad ${r.Ha.n}/9 adulto, ${r.Hc.n}/9 infancia.`,
        report: text.slice(0, 12000),
      });
      if (!res.ok) return void toast.error(res.error);
      toast.success("Guardada en la ficha, en «Evaluaciones con licencia».");
      router.push(`/admin/pacientes/${patientId}`);
      router.refresh();
    });

  const itemCard = (it: DivaItem) => (
    <details key={it.id} open className="rounded-2xl border border-border/70 bg-card">
      <summary className="flex cursor-pointer flex-wrap items-center gap-2 px-4 py-3">
        <span className="rounded-md border border-accent-strong px-1.5 font-mono text-xs font-semibold text-accent-strong">{it.id.replace("H", "H/I ")}</span>
        <span className="min-w-0 flex-1 font-medium">{it.name}</span>
        {(["a", "c"] as const).map((p) => {
          const x = presOf(st, it.id, p);
          return (
            <span key={p} className={cn("rounded-full px-2 py-0.5 font-mono text-xs font-semibold", pill(x))}>
              {p === "a" ? "Adulto" : "Infancia"} {x === true ? "Sí" : x === false ? "No" : "—"}
            </span>
          );
        })}
      </summary>
      <div className="space-y-3 border-t border-border/60 px-4 py-3">
        <p className="text-sm">
          {it.question}
          <span className="mt-1 block text-muted-foreground">{it.childQuestion} ¿Son estas dificultades mayores de lo esperado para su edad?</span>
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {(["a", "c"] as const).map((p) => {
            const s = st.items[it.id]![p];
            const list = p === "a" ? it.adult : it.child;
            return (
              <div key={p} className="min-w-0 space-y-2 rounded-xl bg-surface-muted p-3">
                <p className="flex justify-between text-xs font-semibold uppercase tracking-wider text-accent-strong">
                  {p === "a" ? "Edad adulta" : "Infancia · 5–12 años"}
                  <span className="font-mono font-normal text-muted-foreground">
                    {s.ex.length}/{list.length}
                  </span>
                </p>
                <div className="grid gap-1">
                  {list.map((e, i) => (
                    <label key={i} className="flex items-start gap-2 rounded-lg bg-card px-2 py-1.5 text-sm">
                      <input type="checkbox" className="mt-1 accent-[var(--primary)]" checked={s.ex.includes(i)} onChange={(ev) => setPeriod(it.id, p, (x) => toggleExample(x, i, ev.target.checked))} />
                      <span>{e}</span>
                    </label>
                  ))}
                </div>
                <Input
                  value={s.otro}
                  placeholder="Otros ejemplos"
                  onChange={(ev) => setPeriod(it.id, p, (x) => ({ ...x, otro: ev.target.value, ...(ev.target.value.trim() && x.pres === null ? { pres: true, auto: true } : {}) }))}
                />
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-dashed border-border pt-2 text-sm">
                  <b>¿Síntoma presente?</b>
                  <Seg
                    label={`${it.id} ${p === "a" ? "adulto" : "infancia"}`}
                    value={s.pres === null ? null : s.pres ? "1" : "0"}
                    options={[
                      ["1", s.pres && s.auto ? "Sí (auto)" : "Sí"],
                      ["0", "No"],
                    ]}
                    onChange={(val) => setPeriod(it.id, p, (x) => ({ ...x, pres: val === null ? null : val === "1", auto: false }))}
                  />
                </div>
              </div>
            );
          })}
        </div>
        {it.note ? <p className="text-xs text-muted-foreground">{it.note}</p> : null}
      </div>
    </details>
  );

  const areasBlock = (p: Period) => (
    <div className="grid gap-3 md:grid-cols-2">
      {(p === "a" ? content.areas.adult : content.areas.child).map((a, k) => (
        <div key={a.name} className="min-w-0 space-y-2 rounded-xl bg-surface-muted p-3">
          <p className="flex justify-between text-sm font-semibold">
            {a.name}
            <span className="font-mono text-xs text-muted-foreground">{st.areas[p][k]!.length + (st.areaOtro[p][k]!.trim() ? 1 : 0)}</span>
          </p>
          <div className="grid gap-1">
            {a.examples.map((e, i) => (
              <label key={i} className="flex items-start gap-2 rounded-lg bg-card px-2 py-1.5 text-sm">
                <input type="checkbox" className="mt-1 accent-[var(--primary)]" checked={st.areas[p][k]!.includes(i)} onChange={(ev) => toggleArea(p, k, i, ev.target.checked)} />
                <span>{e}</span>
              </label>
            ))}
          </div>
          <Input value={st.areaOtro[p][k]} placeholder="Otros" onChange={(ev) => setSt((x) => ({ ...x, areaOtro: { ...x.areaOtro, [p]: x.areaOtro[p].map((o, kk) => (kk === k ? ev.target.value : o)) } }))} />
        </div>
      ))}
    </div>
  );

  const triOpts: [Exclude<Tri, null>, string][] = [
    ["si", "Sí"],
    ["no", "No"],
    ["na", "N/A"],
  ];

  return (
    <div className="space-y-4">
      <section className="surface-card grid gap-4 p-4 md:grid-cols-[8rem_1fr_auto] md:items-end">
        <label className="grid gap-1.5 text-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Edad</span>
          <Input type="number" min={16} max={99} inputMode="numeric" value={st.age} onChange={(e) => setSt((x) => ({ ...x, age: e.target.value }))} placeholder="años" />
        </label>
        <div className="space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Informantes además de {patientName}</span>
          <div className="flex flex-wrap gap-1.5">
            {content.informants.map((n) => (
              <label key={n} className={cn("flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm", st.infs.includes(n) ? "border-primary bg-primary-soft font-medium" : "border-border")}>
                <input type="checkbox" className="accent-[var(--primary)]" checked={st.infs.includes(n)} onChange={(e) => setSt((x) => ({ ...x, infs: e.target.checked ? [...x.infs, n] : x.infs.filter((y) => y !== n) }))} />
                {n}
              </label>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input type="checkbox" className="accent-[var(--primary)]" checked={st.negar} onChange={(e) => setSt((x) => ({ ...x, negar: e.target.checked }))} />
          Ítems sin marcar = explorados y negados
        </label>
      </section>

      <nav className="inline-flex flex-wrap gap-1 rounded-xl border border-border bg-card p-1" aria-label="Partes de la entrevista">
        {(
          [
            ["A", "Parte 1 · Inatención", `${r.Aa.n} · ${r.Ac.n}`],
            ["H", "Parte 2 · Hiperactividad-impulsividad", `${r.Ha.n} · ${r.Hc.n}`],
            ["F", "Parte 3 · Disfunción y criterios", "B–E"],
          ] as const
        ).map(([k, l, n]) => (
          <button key={k} type="button" aria-pressed={part === k} onClick={() => setPart(k)} className={cn("min-h-10 rounded-lg px-3 text-sm font-medium", part === k ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>
            {l} <span className="font-mono text-xs opacity-80">{n}</span>
          </button>
        ))}
      </nav>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-3">
          {part === "A" ? content.items.filter((i) => i.domain === "A").map(itemCard) : null}
          {part === "H" ? content.items.filter((i) => i.domain === "H").map(itemCard) : null}
          {part === "F" ? (
            <div className="space-y-3">
              <section className="surface-card space-y-2 p-4">
                <h3 className="font-medium">B · Edad de inicio</h3>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  ¿Varios síntomas estaban presentes antes de los 12 años?
                  <Seg label="Criterio B" value={st.B} options={[["si", "Sí"], ["no", "No"]]} onChange={(B) => setSt((x) => ({ ...x, B }))} />
                </div>
                {st.B === "no" ? (
                  <label className="flex items-center gap-2 text-sm">
                    ¿Desde qué edad?
                    <Input type="number" className="w-24" value={st.onset} onChange={(e) => setSt((x) => ({ ...x, onset: e.target.value }))} />
                  </label>
                ) : null}
              </section>
              <section className="surface-card space-y-2 p-4">
                <h3 className="font-medium">C · Disfunción en la edad adulta</h3>
                <p className="text-sm text-muted-foreground">El criterio exige dificultades en al menos dos áreas.</p>
                {areasBlock("a")}
              </section>
              <section className="surface-card space-y-2 p-4">
                <h3 className="font-medium">C · Disfunción en la infancia y adolescencia</h3>
                {areasBlock("c")}
              </section>
              <section className="surface-card space-y-2 p-4">
                <h3 className="font-medium">D · Información colateral</h3>
                <div className="grid gap-2 text-sm sm:grid-cols-[1fr_auto] sm:items-center">
                  {(
                    [
                      ["aA", "Edad adulta · déficit de atención"],
                      ["aH", "Edad adulta · hiperactividad-impulsividad"],
                      ["cA", "Infancia · déficit de atención"],
                      ["cH", "Infancia · hiperactividad-impulsividad"],
                    ] as const
                  ).map(([k, l]) => (
                    <div key={k} className="contents">
                      <span>{l}</span>
                      <Seg label={l} value={st.col[k]} options={triOpts} onChange={(val) => setSt((x) => ({ ...x, col: { ...x.col, [k]: val } }))} />
                    </div>
                  ))}
                </div>
              </section>
              <section className="surface-card space-y-2 p-4">
                <h3 className="font-medium">E · Explicación alternativa</h3>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  ¿Los síntomas se explican mejor por otro trastorno mental?
                  <Seg label="Criterio E" value={st.E} options={[["no", "No"], ["si", "Sí"], ["pend", "Pendiente"]]} onChange={(E) => setSt((x) => ({ ...x, E }))} />
                </div>
                <Textarea value={st.Etext} onChange={(e) => setSt((x) => ({ ...x, Etext: e.target.value }))} placeholder="Diagnóstico diferencial considerado (ánimo, ansiedad, sueño, sustancias, causas médicas)" className="min-h-16" />
              </section>
            </div>
          ) : null}
        </div>

        <aside className="min-w-0 space-y-3 xl:sticky xl:top-20">
          <div className="surface-card overflow-hidden">
            <table className="w-full text-sm tabular-nums">
              <thead className="bg-surface-muted text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Dominio</th>
                  <th className="px-3 py-2 text-left font-semibold">Adulto</th>
                  <th className="px-3 py-2 text-left font-semibold">Infancia</th>
                </tr>
              </thead>
              <tbody>
                {(
                  [
                    ["Déficit de atención", r.Aa.n, r.Ac.n],
                    ["Hiperactividad-impulsividad", r.Ha.n, r.Hc.n],
                  ] as const
                ).map(([l, a, c]) => (
                  <tr key={l} className="border-t border-border/60">
                    <td className="px-3 py-2">{l}</td>
                    <td className={cn("px-3 py-2 font-mono font-semibold", a >= r.thrAd && "text-mint-700")}>
                      {a}
                      <span className="text-xs font-normal text-muted-foreground">/9 · umbral {r.thrAd}</span>
                    </td>
                    <td className={cn("px-3 py-2 font-mono font-semibold", c >= 6 && "text-mint-700")}>
                      {c}
                      <span className="text-xs font-normal text-muted-foreground">/9 · umbral 6</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <dl className="space-y-1 px-3 py-2 text-sm">
              <div className="flex justify-between gap-2 border-b border-dashed border-border py-1">
                <dt>B · inicio antes de los 12</dt>
                <dd className="font-mono text-xs">{st.B === "si" ? "Sí" : st.B === "no" ? "No" : "—"}</dd>
              </div>
              <div className="flex justify-between gap-2 border-b border-dashed border-border py-1">
                <dt>C · áreas (adulto / infancia)</dt>
                <dd className="font-mono text-xs">
                  {r.Ca.length} / {r.Cc.length} · mín. 2
                </dd>
              </div>
              <div className="flex justify-between gap-2 py-1">
                <dt>E · otra explicación</dt>
                <dd className="font-mono text-xs">{st.E === "no" ? "No" : st.E === "si" ? "Sí" : st.E === "pend" ? "Pendiente" : "—"}</dd>
              </div>
            </dl>
            <div
              className={cn(
                "m-3 rounded-xl border-l-4 px-3 py-2 text-sm",
                v.cls === "ok" ? "border-mint-700 bg-success-soft" : v.cls === "warn" ? "border-warning-strong bg-warning-soft" : "border-primary bg-surface-muted",
              )}
              aria-live="polite"
            >
              <b className="block text-xs uppercase tracking-wider">{v.cls === "ok" ? "Criterios cumplidos" : v.cls === "warn" ? "Criterios no cumplidos" : "En curso"}</b>
              {v.title}
              {v.cls === "ok" && v.code ? ` · CIE-10 ${v.code}` : ""}
              {v.missing.length && v.cls !== "warn" ? <span className="block text-muted-foreground">Falta: {v.missing.join("; ")}</span> : null}
            </div>
          </div>

          <div className="surface-card space-y-2 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Texto para el HIS / informe</p>
              {edited !== null ? (
                <Button size="sm" variant="ghost" onClick={() => setEdited(null)}>
                  Regenerar
                </Button>
              ) : null}
            </div>
            <Textarea value={text} onChange={(e) => setEdited(e.target.value)} className="min-h-80 font-mono text-xs leading-relaxed" aria-label="Texto generado" spellCheck={false} />
            <p className="text-xs text-muted-foreground">{edited !== null ? "Editado a mano: ya no se actualiza solo." : "Se actualiza solo. Podés editarlo antes de guardar."}</p>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 text-sm">
                Fecha
                <Input type="date" value={appliedOn} onChange={(e) => setAppliedOn(e.target.value)} className="w-40" />
              </label>
              <Button onClick={save} loading={pending}>
                <Save aria-hidden /> Guardar en la ficha
              </Button>
              <Button variant="outline" onClick={() => navigator.clipboard.writeText(text).then(() => toast.success("Copiado."), () => toast.error("No se pudo copiar."))}>
                <Copy aria-hidden /> Copiar
              </Button>
              <Button
                variant={confirmClear ? "destructive" : "ghost"}
                onClick={() => {
                  if (!confirmClear) {
                    setConfirmClear(true);
                    window.setTimeout(() => setConfirmClear(false), 4000);
                    return;
                  }
                  setSt(freshState(content));
                  setEdited(null);
                  setConfirmClear(false);
                }}
              >
                <RotateCcw aria-hidden /> {confirmClear ? "Confirmar: borrar todo" : "Limpiar"}
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{content.source} Apoyo al juicio clínico: el Criterio E requiere la evaluación del profesional. Códigos CIE-10 orientativos.</p>
        </aside>
      </div>
    </div>
  );
}
