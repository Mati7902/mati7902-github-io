"use client";

import { Check, CheckCircle2, Info } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { RichText } from "@/components/exercises/rich-text";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { normalizePrompt, type WorkbookChapter, type WorkbookPrompt } from "@/lib/workbook/rules";
import { saveWorkbookAnswerAction } from "@/server/actions/workbook-answers";

/** Capítulos del cuadernillo: se leen y cada hoja de trabajo se completa ahí mismo (se guarda sola). */
export function WorkbookChapters({ workbookId, chapters, answers }: { workbookId: string; chapters: WorkbookChapter[]; answers: Record<string, string> }) {
  return (
    <div className="space-y-8">
      {chapters.map((ch, i) => {
        const prompts = ch.prompts.map(normalizePrompt);
        const done = prompts.filter((p) => (answers[p.key] ?? "").trim() !== "" && answers[p.key] !== "[]").length;
        return (
          <section key={ch.key} aria-labelledby={`cap-${ch.key}`} className="surface-card space-y-4 p-5 sm:p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-xs font-medium uppercase tracking-wider text-accent-strong">Capítulo {i + 1}</p>
              {prompts.length ? <p className="text-xs tabular-nums text-muted-foreground">{done} de {prompts.length} completadas</p> : null}
            </div>
            <h2 id={`cap-${ch.key}`} className="font-display text-2xl font-medium">{ch.title}</h2>
            <RichText text={ch.body} className="text-base leading-relaxed text-foreground" />
            {prompts.length ? (
              <div className="space-y-6 border-t border-divider pt-5">
                <p className="text-sm font-semibold">Hoja de trabajo</p>
                {prompts.map((p, n) => (
                  <PromptField key={p.key} workbookId={workbookId} prompt={p} number={n + 1} initial={answers[p.key] ?? ""} />
                ))}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

function useAutosave(workbookId: string, promptKey: string, initial: string) {
  const [saved, setSaved] = useState(initial);
  const [pending, startTransition] = useTransition();
  const save = (value: string) => {
    if (value === saved) return;
    startTransition(async () => {
      const r = await saveWorkbookAnswerAction({ workbookId, promptKey, answer: value });
      if (!r.ok) return void toast.error(r.error);
      setSaved(value);
    });
  };
  return { saved, pending, save };
}

const parseList = (v: string): string[] => {
  try {
    const x = JSON.parse(v);
    return Array.isArray(x) ? x.map(String) : [];
  } catch {
    return v ? [v] : [];
  }
};

const chip = (selected: boolean) =>
  cn(
    "min-h-11 rounded-xl border px-3.5 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/60",
  );

function PromptField({ workbookId, prompt: p, number, initial }: { workbookId: string; prompt: WorkbookPrompt & { type: NonNullable<WorkbookPrompt["type"]> }; number: number; initial: string }) {
  const { saved, pending, save } = useAutosave(workbookId, p.key, initial);
  const [value, setValue] = useState(initial);
  const choose = (v: string) => {
    setValue(v);
    save(v);
  };
  const label = (
    <p className="font-medium">
      <span className="mr-1.5 tabular-nums text-muted-foreground">{number}.</span>
      {p.text}
    </p>
  );
  const status = (
    <span className="flex h-4 items-center gap-1 text-xs text-muted-foreground" aria-live="polite">
      {pending ? "Guardando…" : saved && value === saved ? (
        <>
          <Check className="size-3" aria-hidden /> Guardado
        </>
      ) : null}
    </span>
  );
  const feedback =
    p.feedback && saved && (p.type === "vf" || p.type === "choice") ? (
      <p className={cn("flex items-start gap-2 rounded-xl px-3 py-2 text-sm", !p.correct || saved === p.correct ? "bg-success-soft text-foreground" : "bg-warning-soft text-foreground")}>
        {!p.correct || saved === p.correct ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden /> : <Info className="mt-0.5 size-4 shrink-0 text-warning-strong" aria-hidden />}
        <span>
          {p.correct ? (saved === p.correct ? "¡Bien! " : `La respuesta es ${p.type === "vf" ? (p.correct === "v" ? "verdadero" : "falso") : `«${p.correct}»`}. `) : null}
          {p.feedback}
        </span>
      </p>
    ) : null;

  switch (p.type) {
    case "vf":
      return (
        <fieldset className="space-y-2">
          <legend>{label}</legend>
          <div className="flex gap-2" role="radiogroup">
            {[
              ["v", "Verdadero"],
              ["f", "Falso"],
            ].map(([v, l]) => (
              <button key={v} type="button" role="radio" aria-checked={value === v} onClick={() => choose(v!)} className={chip(value === v)}>
                {l}
              </button>
            ))}
          </div>
          {feedback}
          {status}
        </fieldset>
      );
    case "choice":
      return (
        <fieldset className="space-y-2">
          <legend>{label}</legend>
          <div className="flex flex-wrap gap-2" role="radiogroup">
            {(p.options ?? []).map((o) => (
              <button key={o} type="button" role="radio" aria-checked={value === o} onClick={() => choose(o)} className={chip(value === o)}>
                {o}
              </button>
            ))}
          </div>
          {feedback}
          {status}
        </fieldset>
      );
    case "checklist": {
      const selected = parseList(value);
      const toggle = (o: string) => choose(JSON.stringify(selected.includes(o) ? selected.filter((x) => x !== o) : [...selected, o]));
      return (
        <fieldset className="space-y-2">
          <legend>{label}</legend>
          <p className="text-xs text-muted-foreground">Marcá todas las que correspondan.</p>
          <div className="flex flex-wrap gap-2">
            {(p.options ?? []).map((o) => (
              <button key={o} type="button" role="checkbox" aria-checked={selected.includes(o)} onClick={() => toggle(o)} className={chip(selected.includes(o))}>
                {o}
              </button>
            ))}
          </div>
          {status}
        </fieldset>
      );
    }
    case "scale": {
      const min = p.min ?? 0;
      const max = p.max ?? 10;
      return (
        <fieldset className="space-y-2">
          <legend>{label}</legend>
          <div className="flex flex-wrap gap-1.5" role="radiogroup">
            {Array.from({ length: max - min + 1 }, (_, k) => String(min + k)).map((v) => (
              <button key={v} type="button" role="radio" aria-checked={value === v} aria-label={v} onClick={() => choose(v)} className={cn("size-11 rounded-xl border text-sm font-medium tabular-nums", value === v ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/60")}>
                {v}
              </button>
            ))}
          </div>
          {p.minLabel || p.maxLabel ? (
            <p className="flex max-w-md justify-between text-xs text-muted-foreground">
              <span>{p.minLabel}</span>
              <span>{p.maxLabel}</span>
            </p>
          ) : null}
          {status}
        </fieldset>
      );
    }
    case "list": {
      const count = p.count ?? 3;
      const items = parseList(value);
      const rows = Array.from({ length: count }, (_, k) => items[k] ?? "");
      const setRow = (k: number, text: string) => setValue(JSON.stringify(rows.map((r, idx) => (idx === k ? text : r))));
      return (
        <fieldset className="space-y-2">
          <legend>{label}</legend>
          <ol className="space-y-2">
            {rows.map((r, k) => (
              <li key={k} className="flex items-center gap-2">
                <span className="w-5 text-right text-sm tabular-nums text-muted-foreground">{k + 1}.</span>
                <Input value={r} onChange={(e) => setRow(k, e.target.value)} onBlur={() => save(JSON.stringify(parseList(value).some((x) => x.trim()) ? parseList(value) : []))} maxLength={400} aria-label={`${p.text}, renglón ${k + 1}`} />
              </li>
            ))}
          </ol>
          {status}
        </fieldset>
      );
    }
    default:
      return (
        <label className="grid gap-1.5">
          {label}
          <Textarea value={value} onChange={(e) => setValue(e.target.value)} onBlur={() => save(value)} maxLength={5000} rows={Math.min(10, Math.max(2, p.lines ?? 3))} />
          {status}
        </label>
      );
  }
}
