"use client";

import { Check } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { RichText } from "@/components/exercises/rich-text";
import { Textarea } from "@/components/ui/textarea";
import type { WorkbookChapter } from "@/lib/workbook/rules";
import { saveWorkbookAnswerAction } from "@/server/actions/workbook-answers";

/** Capítulos del cuadernillo: se leen y las consignas se responden ahí mismo (se guarda solo al salir del campo). */
export function WorkbookChapters({ workbookId, chapters, answers }: { workbookId: string; chapters: WorkbookChapter[]; answers: Record<string, string> }) {
  return (
    <div className="space-y-8">
      {chapters.map((ch, i) => (
        <section key={ch.key} aria-labelledby={`cap-${ch.key}`} className="surface-card space-y-4 p-5 sm:p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-accent-strong">Capítulo {i + 1}</p>
          <h2 id={`cap-${ch.key}`} className="font-display text-2xl font-medium">{ch.title}</h2>
          <RichText text={ch.body} className="text-base leading-relaxed text-foreground" />
          {ch.prompts.length ? (
            <div className="space-y-4 border-t border-divider pt-4">
              {ch.prompts.map((p) => (
                <Answer key={p.key} workbookId={workbookId} promptKey={p.key} label={p.text} lines={p.lines} initial={answers[p.key] ?? ""} />
              ))}
            </div>
          ) : null}
        </section>
      ))}
    </div>
  );
}

function Answer({ workbookId, promptKey, label, lines, initial }: { workbookId: string; promptKey: string; label: string; lines: number; initial: string }) {
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [pending, startTransition] = useTransition();
  const save = () => {
    if (value === saved) return;
    startTransition(async () => {
      const r = await saveWorkbookAnswerAction({ workbookId, promptKey, answer: value });
      if (!r.ok) return void toast.error(r.error);
      setSaved(value);
    });
  };
  return (
    <label className="grid gap-1.5">
      <span className="font-medium">{label}</span>
      <Textarea value={value} onChange={(e) => setValue(e.target.value)} onBlur={save} maxLength={5000} rows={Math.min(10, Math.max(2, lines))} />
      <span className="flex h-4 items-center gap-1 text-xs text-muted-foreground" aria-live="polite">
        {pending ? "Guardando…" : value === saved && saved ? (
          <>
            <Check className="size-3" aria-hidden /> Guardado
          </>
        ) : null}
      </span>
    </label>
  );
}
