"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";

import { BreathingExercise } from "@/components/calm/breathing-exercise";
import { HelpfulPrompt } from "@/components/exercises/helpful-prompt";
import type { BreathingConfig } from "@/lib/exercises/steps";
import { saveExerciseResponseAction } from "@/server/actions/exercises";

/** Envuelve el ejercicio de respiración para registrar la práctica completada. */
export function BreathingSession({ templateId, title, config }: { templateId: string; title: string; config: BreathingConfig }) {
  const [savedId, setSavedId] = useState<string | null>(null);
  const onComplete = useCallback(
    async ({ durationMinutes }: { durationMinutes: number }) => {
      const result = await saveExerciseResponseAction({
        templateId,
        answers: { duration_minutes: durationMinutes },
        durationSeconds: durationMinutes * 60,
      });
      if (result.ok) {
        toast.success("Listo. Registramos tu práctica.");
        setSavedId(result.data.id);
      }
    },
    [templateId],
  );
  return (
    <div className="space-y-6">
      <BreathingExercise config={config} title={title} onComplete={onComplete} />
      {savedId ? <HelpfulPrompt key={savedId} responseId={savedId} /> : null}
    </div>
  );
}
