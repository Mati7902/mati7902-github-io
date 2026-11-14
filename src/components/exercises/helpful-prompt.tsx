"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { rateExerciseAction } from "@/server/actions/exercises";

const OPTIONS = [
  { value: "si", label: "Sí", emoji: "🙂" },
  { value: "algo", label: "Un poco", emoji: "😐" },
  { value: "no", label: "No mucho", emoji: "🙁" },
] as const;

/** Una sola pregunta, de un toque, al terminar. No es obligatoria. */
export function HelpfulPrompt({ responseId, onDone }: { responseId: string; onDone?: () => void }) {
  const [answered, setAnswered] = useState(false);
  const [pending, startTransition] = useTransition();
  if (answered) return <p className="text-center text-sm text-muted-foreground">Gracias. Tu psicólogo lo va a tener en cuenta.</p>;
  return (
    <div className="surface-card space-y-4 p-5 text-center">
      <p className="font-display text-xl font-medium">¿Te sirvió este ejercicio?</p>
      <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="¿Te sirvió este ejercicio?">
        {OPTIONS.map((o) => (
          <Button
            key={o.value}
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await rateExerciseAction({ id: responseId, helpful: o.value });
                setAnswered(true);
                onDone?.();
              })
            }
          >
            <span aria-hidden>{o.emoji}</span> {o.label}
          </Button>
        ))}
      </div>
      {onDone ? (
        <button type="button" className="text-sm text-muted-foreground underline-offset-4 hover:underline" onClick={onDone}>
          Prefiero no responder
        </button>
      ) : null}
    </div>
  );
}
