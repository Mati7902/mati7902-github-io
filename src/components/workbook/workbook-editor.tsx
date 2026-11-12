"use client";

import { AlertTriangle, ArrowDown, ArrowUp, CheckCircle2, Info, Plus, Printer, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PROMPT_TYPE_LABEL, PROMPT_TYPES, type PromptType, type WorkbookChapter, type WorkbookContent, type WorkbookItem, type WorkbookPrompt, type WorkbookSources } from "@/lib/workbook/rules";
import { generateWorkbookDraftAction, publishWorkbookAction, saveWorkbookAction } from "@/server/actions/workbooks";

type Props = {
  patientId: string;
  workbookId: string;
  version: number;
  publishedVersion: number | null;
  content: WorkbookContent;
  sources: WorkbookSources;
  templates: { slug: string; title: string; minutes: number | null; group: string }[];
  history: { version: number; origin: string; created_at: string; approved_at: string | null }[];
  aiAvailable: boolean;
};

const selectClass = "h-11 w-full rounded-xl border border-input bg-card px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30";

// Las claves no cambian al reordenar: las respuestas del paciente quedan atadas a su consigna.
const nextChapterKey = (list: WorkbookChapter[]) => `c${Math.max(0, ...list.map((c) => Number(c.key.slice(1)) || 0)) + 1}`;
const nextPromptKey = (ch: WorkbookChapter) => `${ch.key}p${Math.max(0, ...ch.prompts.map((p) => Number(p.key.split("p")[1]) || 0)) + 1}`;

/** Editor del cuadernillo: leer, modificar, quitar o agregar actividades, ver de dónde salió cada sugerencia y aprobar. */
export function WorkbookEditor({ patientId, workbookId, version, publishedVersion, content, sources, templates, history, aiAvailable }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState<WorkbookContent>(content);
  const [adding, setAdding] = useState("");
  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(content), [draft, content]);
  const isPublished = publishedVersion === version && !dirty;

  const setItem = (i: number, patch: Partial<WorkbookItem>) => setDraft((d) => ({ ...d, items: d.items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)) }));
  const move = (i: number, delta: number) =>
    setDraft((d) => {
      const items = [...d.items];
      const j = i + delta;
      if (j < 0 || j >= items.length) return d;
      [items[i], items[j]] = [items[j]!, items[i]!];
      return { ...d, items };
    });
  const setChapter = (i: number, patch: Partial<WorkbookChapter>) => setDraft((d) => ({ ...d, chapters: (d.chapters ?? []).map((c, k) => (k === i ? { ...c, ...patch } : c)) }));
  const moveChapter = (i: number, delta: number) =>
    setDraft((d) => {
      const list = [...(d.chapters ?? [])];
      const j = i + delta;
      if (j < 0 || j >= list.length) return d;
      [list[i], list[j]] = [list[j]!, list[i]!];
      return { ...d, chapters: list };
    });
  const remove = (i: number) => setDraft((d) => ({ ...d, items: d.items.filter((_, idx) => idx !== i) }));
  const add = () => {
    const t = templates.find((x) => x.slug === adding);
    if (!t || draft.items.some((i) => i.slug === t.slug)) return;
    setDraft((d) => ({ ...d, items: [...d.items, { slug: t.slug, title: t.title, minutes: t.minutes, note: null, dueInDays: null }] }));
    setAdding("");
  };

  const save = (then?: (v: number) => void) =>
    startTransition(async () => {
      const r = await saveWorkbookAction({ patientId, workbookId, content: draft });
      if (!r.ok) return void toast.error(r.fieldErrors ? (Object.values(r.fieldErrors)[0] ?? r.error) : r.error);
      if (then) then(r.data.version);
      else {
        toast.success(`Guardado como versión ${r.data.version}.`);
        router.refresh();
      }
    });
  const publish = () => {
    const doPublish = (v: number) =>
      startTransition(async () => {
        const r = await publishWorkbookAction({ patientId, workbookId, version: v });
        if (!r.ok) return void toast.error(r.error);
        toast.success(`Publicado. ${r.data.assigned} ${r.data.assigned === 1 ? "actividad asignada" : "actividades asignadas"}. El paciente recibió un aviso.`);
        router.refresh();
      });
    if (dirty) save(doPublish);
    else doPublish(version);
  };
  const regenerate = (useAI: boolean) =>
    startTransition(async () => {
      if (useAI) toast.info("Redactando con IA… puede tardar unos minutos. No cierres esta página.");
      const r = await generateWorkbookDraftAction(patientId, { useAI });
      if (!r.ok) return void toast.error(r.error);
      toast.success(r.data.usedAI ? `Borrador redactado con IA (versión ${r.data.version}). Revisalo.` : `Borrador armado con las reglas (versión ${r.data.version}).`);
      router.refresh();
    });

  const groups = [...new Set(templates.map((t) => t.group))];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-2">
        {isPublished ? <Badge variant="success">Publicado · versión {version}</Badge> : <Badge variant="warning">{dirty ? "Cambios sin guardar" : `Borrador · versión ${version}`}</Badge>}
        {publishedVersion && publishedVersion !== version ? <Badge variant="muted">El paciente ve la versión {publishedVersion}</Badge> : null}
        <div className="ml-auto flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href={`/admin/pacientes/${patientId}/cuadernillo/imprimir`} target="_blank">
              <Printer aria-hidden /> Vista PDF
            </Link>
          </Button>
          {aiAvailable ? (
            <Button variant="outline" onClick={() => regenerate(true)} disabled={pending}>
              <Sparkles aria-hidden /> Redactar con IA
            </Button>
          ) : null}
          <Button variant="ghost" onClick={() => regenerate(false)} disabled={pending}>
            <RefreshCw aria-hidden /> Rearmar con reglas
          </Button>
        </div>
      </div>

      {sources.flags.length > 0 ? (
        <section className="space-y-2 rounded-2xl border border-warning/40 bg-warning-soft/60 p-4" aria-labelledby="revisar">
          <h2 id="revisar" className="flex items-center gap-2 text-sm font-semibold">
            <AlertTriangle className="size-4" aria-hidden /> Para revisar en sesión (el paciente no lo ve)
          </h2>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {sources.flags.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="font-display text-xl font-medium">Bienvenida</h2>
        <Textarea value={draft.welcome} onChange={(e) => setDraft({ ...draft, welcome: e.target.value })} maxLength={1500} className="min-h-28" />
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-medium">Objetivos en palabras del paciente</h2>
        <p className="text-xs text-muted-foreground">Salen de la ficha de ingreso. Revisá que no quede información sensible.</p>
        <ul className="space-y-2">
          {draft.goals.map((g, i) => (
            <li key={i} className="flex gap-2">
              <Input value={g} onChange={(e) => setDraft({ ...draft, goals: draft.goals.map((x, idx) => (idx === i ? e.target.value : x)) })} maxLength={200} aria-label={`Objetivo ${i + 1}`} />
              <Button size="icon" variant="ghost" aria-label="Quitar objetivo" onClick={() => setDraft({ ...draft, goals: draft.goals.filter((_, idx) => idx !== i) })}>
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
        {draft.goals.length < 8 ? (
          <Button variant="outline" size="sm" onClick={() => setDraft({ ...draft, goals: [...draft.goals, ""] })}>
            <Plus aria-hidden /> Agregar objetivo
          </Button>
        ) : null}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-medium">Capítulos ({(draft.chapters ?? []).length})</h2>
        <p className="text-xs text-muted-foreground">Psicoeducación y hojas de trabajo escritas para este paciente. Párrafos separados por una línea en blanco, viñetas con «- » y **negrita**.</p>
        <ol className="space-y-4">
          {(draft.chapters ?? []).map((ch, ci) => (
            <li key={ch.key} className="space-y-3 rounded-2xl border border-border/70 bg-card p-4">
              <div className="flex items-center gap-2">
                <span className="text-sm tabular-nums text-muted-foreground">{ci + 1}.</span>
                <Input value={ch.title} onChange={(e) => setChapter(ci, { title: e.target.value })} maxLength={140} className="font-medium" aria-label={`Título del capítulo ${ci + 1}`} />
                <Button size="icon-sm" variant="ghost" aria-label="Subir capítulo" onClick={() => moveChapter(ci, -1)} disabled={ci === 0}>
                  <ArrowUp />
                </Button>
                <Button size="icon-sm" variant="ghost" aria-label="Bajar capítulo" onClick={() => moveChapter(ci, 1)} disabled={ci === (draft.chapters ?? []).length - 1}>
                  <ArrowDown />
                </Button>
                <Button size="icon-sm" variant="ghost" className="text-muted-foreground hover:text-destructive" aria-label={`Quitar capítulo ${ci + 1}`} onClick={() => setDraft((d) => ({ ...d, chapters: (d.chapters ?? []).filter((_, k) => k !== ci) }))}>
                  <Trash2 />
                </Button>
              </div>
              <Textarea value={ch.body} onChange={(e) => setChapter(ci, { body: e.target.value })} maxLength={6000} className="min-h-40 text-sm" aria-label={`Texto del capítulo ${ci + 1}`} />
              <div className="space-y-2">
                <p className="text-xs font-medium">Hoja de trabajo (el paciente la completa en la app)</p>
                {ch.prompts.map((p, pi) => (
                  <PromptEditor
                    key={p.key}
                    prompt={p}
                    onChange={(patch) => setChapter(ci, { prompts: ch.prompts.map((x, k) => (k === pi ? { ...x, ...patch } : x)) })}
                    onRemove={() => setChapter(ci, { prompts: ch.prompts.filter((_, k) => k !== pi) })}
                  />
                ))}
                {ch.prompts.length < 8 ? (
                  <Button variant="outline" size="sm" onClick={() => setChapter(ci, { prompts: [...ch.prompts, { key: nextPromptKey(ch), type: "text", text: "", lines: 3 }] })}>
                    <Plus aria-hidden /> Agregar consigna
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
        <Button variant="outline" size="sm" onClick={() => setDraft((d) => ({ ...d, chapters: [...(d.chapters ?? []), { key: nextChapterKey(d.chapters ?? []), title: "Nuevo capítulo", body: "", prompts: [] }] }))}>
          <Plus aria-hidden /> Agregar capítulo
        </Button>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-medium">Actividades ({draft.items.length})</h2>
        <ol className="space-y-3">
          {draft.items.map((item, i) => {
            const why = sources.reasons[item.slug];
            return (
              <li key={item.slug} className="space-y-3 rounded-2xl border border-border/70 bg-card p-4">
                <div className="flex items-start gap-2">
                  <span className="mt-1 text-sm tabular-nums text-muted-foreground">{i + 1}.</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{item.title}</p>
                    {why ? (
                      <p className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground">
                        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden /> <span>Por qué está: {why.join(" · ")}</span>
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-muted-foreground">Agregado por el profesional.</p>
                    )}
                  </div>
                  <div className="flex shrink-0">
                    <Button size="icon-sm" variant="ghost" aria-label="Subir" onClick={() => move(i, -1)} disabled={i === 0}>
                      <ArrowUp />
                    </Button>
                    <Button size="icon-sm" variant="ghost" aria-label="Bajar" onClick={() => move(i, 1)} disabled={i === draft.items.length - 1}>
                      <ArrowDown />
                    </Button>
                    <Button size="icon-sm" variant="ghost" className="text-muted-foreground hover:text-destructive" aria-label={`Quitar ${item.title}`} onClick={() => remove(i)}>
                      <Trash2 />
                    </Button>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-[1fr_8rem_8rem]">
                  <Input value={item.note ?? ""} onChange={(e) => setItem(i, { note: e.target.value || null })} maxLength={500} placeholder="Indicación para el paciente (opcional)" aria-label="Indicación" />
                  <label className="flex items-center gap-2 text-sm">
                    <Input type="number" min={1} max={240} value={item.minutes ?? ""} onChange={(e) => setItem(i, { minutes: e.target.value ? Number(e.target.value) : null })} className="w-20" aria-label="Minutos" /> min
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    en
                    <Input type="number" min={1} max={90} value={item.dueInDays ?? ""} onChange={(e) => setItem(i, { dueInDays: e.target.value ? Number(e.target.value) : null })} className="w-16" aria-label="Días para completar" /> días
                  </label>
                </div>
              </li>
            );
          })}
        </ol>
        <div className="flex gap-2">
          <select value={adding} onChange={(e) => setAdding(e.target.value)} className={selectClass} aria-label="Agregar actividad">
            <option value="">Agregar una actividad de la biblioteca…</option>
            {groups.map((g) => (
              <optgroup key={g} label={g}>
                {templates
                  .filter((t) => t.group === g && !draft.items.some((i) => i.slug === t.slug))
                  .map((t) => (
                    <option key={t.slug} value={t.slug}>{t.title}</option>
                  ))}
              </optgroup>
            ))}
          </select>
          <Button variant="outline" onClick={add} disabled={!adding}>
            <Plus aria-hidden /> Agregar
          </Button>
        </div>
        {sources.missing.length > 0 ? <p className="text-xs text-muted-foreground">Sugerencias sin plantilla cargada (corré el SQL de actualización): {sources.missing.join(", ")}.</p> : null}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-medium">Cierre</h2>
        <Textarea value={draft.closing} onChange={(e) => setDraft({ ...draft, closing: e.target.value })} maxLength={800} className="min-h-20" />
      </section>

      <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-3 rounded-2xl border border-border/70 bg-card/95 p-3 shadow-[var(--shadow-float)] backdrop-blur">
        <Button variant="outline" onClick={() => save()} disabled={pending || !dirty}>
          Guardar versión
        </Button>
        <Button onClick={publish} loading={pending} disabled={isPublished}>
          <CheckCircle2 aria-hidden /> Aprobar y publicar
        </Button>
        <p className="text-xs text-muted-foreground">Al publicar, el paciente lo ve y sus actividades quedan asignadas.</p>
      </div>

      <details className="rounded-2xl border border-border/70 bg-card px-5 py-3 text-sm">
        <summary className="cursor-pointer font-medium">Historial de versiones ({history.length})</summary>
        <ul className="mt-3 divide-y divide-divider">
          {history.map((h) => (
            <li key={h.version} className="flex flex-wrap justify-between gap-2 py-2">
              <span>
                Versión {h.version} · {h.origin === "ai" ? "redactada con IA" : h.origin === "rules" ? "armada con reglas" : "editada"}
              </span>
              <span className="text-muted-foreground">
                {new Date(h.created_at).toLocaleString("es-PY", { dateStyle: "short", timeStyle: "short" })}
                {h.approved_at ? " · aprobada" : ""}
              </span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}

/** Una consigna de la hoja de trabajo: tipo y los campos que ese tipo necesita. */
function PromptEditor({ prompt: p, onChange, onRemove }: { prompt: WorkbookPrompt; onChange: (patch: Partial<WorkbookPrompt>) => void; onRemove: () => void }) {
  const type: PromptType = p.type ?? "text";
  const small = "h-10 rounded-lg border border-input bg-card px-2 text-sm";
  return (
    <div className="space-y-2 rounded-xl border border-border/60 bg-background p-3">
      <div className="flex flex-wrap items-center gap-2">
        <select value={type} onChange={(e) => onChange({ type: e.target.value as PromptType })} className={small} aria-label="Tipo de consigna">
          {PROMPT_TYPES.map((t) => (
            <option key={t} value={t}>{PROMPT_TYPE_LABEL[t]}</option>
          ))}
        </select>
        <Input value={p.text} onChange={(e) => onChange({ text: e.target.value })} maxLength={400} className="min-w-0 flex-1" placeholder={type === "vf" ? "Afirmación" : "Consigna"} aria-label="Consigna" />
        <Button size="icon-sm" variant="ghost" aria-label="Quitar consigna" onClick={onRemove}>
          <Trash2 />
        </Button>
      </div>
      {type === "text" ? (
        <label className="flex items-center gap-1 text-xs">
          <Input type="number" min={1} max={10} value={p.lines ?? 3} onChange={(e) => onChange({ lines: Number(e.target.value) || 3 })} className="h-9 w-16" aria-label="Renglones" /> renglones en el PDF
        </label>
      ) : null}
      {type === "list" ? (
        <label className="flex items-center gap-1 text-xs">
          <Input type="number" min={1} max={10} value={p.count ?? 3} onChange={(e) => onChange({ count: Number(e.target.value) || 3 })} className="h-9 w-16" aria-label="Cantidad" /> renglones para completar
        </label>
      ) : null}
      {type === "scale" ? (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          de
          <select value={p.min ?? 0} onChange={(e) => onChange({ min: Number(e.target.value) })} className={small} aria-label="Mínimo">
            <option value={0}>0</option>
            <option value={1}>1</option>
          </select>
          a
          <select value={p.max ?? 10} onChange={(e) => onChange({ max: Number(e.target.value) })} className={small} aria-label="Máximo">
            {[3, 4, 5, 7, 10].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <Input value={p.minLabel ?? ""} onChange={(e) => onChange({ minLabel: e.target.value })} maxLength={40} placeholder="Etiqueta mínima" className="h-9 w-36" aria-label="Etiqueta mínima" />
          <Input value={p.maxLabel ?? ""} onChange={(e) => onChange({ maxLabel: e.target.value })} maxLength={40} placeholder="Etiqueta máxima" className="h-9 w-36" aria-label="Etiqueta máxima" />
        </div>
      ) : null}
      {type === "choice" || type === "checklist" ? (
        <Textarea
          value={(p.options ?? []).join("\n")}
          onChange={(e) => onChange({ options: e.target.value.split("\n").slice(0, 10) })}
          className="min-h-20 text-sm"
          placeholder="Una opción por renglón"
          aria-label="Opciones (una por renglón)"
        />
      ) : null}
      {type === "vf" ? (
        <select value={p.correct ?? ""} onChange={(e) => onChange({ correct: e.target.value || undefined })} className={small} aria-label="Respuesta correcta">
          <option value="">Sin respuesta correcta (reflexión)</option>
          <option value="v">Correcta: verdadero</option>
          <option value="f">Correcta: falso</option>
        </select>
      ) : null}
      {type === "choice" ? (
        <select value={p.correct ?? ""} onChange={(e) => onChange({ correct: e.target.value || undefined })} className={small} aria-label="Opción correcta">
          <option value="">Sin respuesta correcta (preferencia personal)</option>
          {(p.options ?? []).filter((o) => o.trim()).map((o) => (
            <option key={o} value={o}>Correcta: {o}</option>
          ))}
        </select>
      ) : null}
      {type === "vf" || type === "choice" ? (
        <Input value={p.feedback ?? ""} onChange={(e) => onChange({ feedback: e.target.value })} maxLength={600} placeholder="Explicación que ve el paciente al responder (opcional)" className="text-sm" aria-label="Explicación" />
      ) : null}
    </div>
  );
}
