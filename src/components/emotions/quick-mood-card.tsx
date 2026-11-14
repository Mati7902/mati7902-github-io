"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { MoodScale } from "@/components/emotions/mood-scale";
import { saveEmotionalLogAction } from "@/server/actions/emotional-logs";

/** Registrar el ánimo en un toque desde Inicio. Después se puede contar más, si se quiere. */
export function QuickMoodCard({ todayMood }: { todayMood: number | null }) {
  const [saved, setSaved] = useState<number | null>(todayMood);
  const [again, setAgain] = useState(false);
  const [value, setValue] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  const save = (mood: number) => {
    setValue(mood);
    startTransition(async () => {
      const r = await saveEmotionalLogAction({ mood, emotions: [] });
      if (!r.ok) {
        setValue(null);
        return void toast.error(r.error);
      }
      setSaved(mood);
      setAgain(false);
      setValue(null);
    });
  };

  return (
    <section aria-labelledby="quick-mood-title" className="surface-card space-y-4 p-5">
      {saved !== null && !again ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-full bg-success-soft text-mint-700">
            <Check className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="quick-mood-title" className="font-medium">
              Hoy registraste tu ánimo: {saved} de 10
            </h2>
            <p className="text-sm text-muted-foreground">
              <Link href="/app/registro/nuevo" className="text-primary underline-offset-4 hover:underline">
                Contar más
              </Link>{" "}
              ·{" "}
              <button type="button" className="text-primary underline-offset-4 hover:underline" onClick={() => setAgain(true)}>
                Registrar de nuevo
              </button>
            </p>
          </div>
        </div>
      ) : (
        <>
          <div>
            <h2 id="quick-mood-title" className="font-display text-xl font-medium">
              ¿Cómo está tu ánimo ahora?
            </h2>
            <p className="text-sm text-muted-foreground">Un toque alcanza: 1 es muy bajo y 10 muy bien.</p>
          </div>
          <div aria-busy={pending} className={pending ? "pointer-events-none opacity-60" : undefined}>
            <MoodScale value={value} onChange={save} />
          </div>
        </>
      )}
    </section>
  );
}
