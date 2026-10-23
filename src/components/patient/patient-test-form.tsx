"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { submitTestAction } from "@/server/actions/clinical";

type Props = {
  assignmentId: string;
  intro: string;
  items: string[];
  options: { value: string; label: string }[];
  /** Se muestra si hubo una respuesta de riesgo (protocolo de emergencia configurado). */
  crisis: React.ReactNode;
};

/** Cuestionario asignado por el profesional. Las respuestas se envían juntas; el puntaje lo calcula el servidor. */
export function PatientTestForm({ assignmentId, intro, items, options, crisis }: Props) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const [risk, setRisk] = useState(false);
  const answered = items.filter((_, i) => answers[String(i)] !== undefined).length;

  const submit = () =>
    startTransition(async () => {
      const result = await submitTestAction({ assignmentId, answers });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (result.data.risk) {
        setRisk(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      toast.success("Listo, gracias por responder. Tu psicólogo ya puede verlo.");
      router.push("/app/tests");
      router.refresh();
    });

  if (risk) {
    return (
      <div className="space-y-5">
        <div className="space-y-2">
          <h2 className="font-display text-2xl font-medium">Gracias por contar cómo estás</h2>
          <p className="text-muted-foreground">Algunas de tus respuestas nos importan mucho. Ya le avisamos a tu psicólogo. Si en este momento te sentís en peligro o pensás en hacerte daño, pedí ayuda ahora:</p>
        </div>
        {crisis}
        <Button variant="outline" onClick={() => router.push("/app")}>
          Volver al inicio
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">{intro}</p>
      <div className="space-y-1.5">
        <Progress value={(answered / items.length) * 100} aria-label={`${answered} de ${items.length} respondidas`} />
        <p className="text-xs text-muted-foreground">
          {answered} de {items.length} respondidas
        </p>
      </div>
      <ol className="space-y-4">
        {items.map((text, i) => (
          <li key={i} className="surface-card space-y-3 p-4">
            <fieldset>
              <legend className="text-base font-medium">
                <span className="mr-1.5 text-muted-foreground tabular-nums">{i + 1}.</span>
                {text}
              </legend>
              <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label={`Pregunta ${i + 1}`}>
                {options.map((o) => {
                  const selected = answers[String(i)] === o.value;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setAnswers((a) => ({ ...a, [String(i)]: o.value }))}
                      className={cn(
                        "min-h-11 rounded-xl border px-3.5 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/60",
                      )}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          </li>
        ))}
      </ol>
      <Button size="lg" onClick={submit} disabled={answered < items.length} loading={pending}>
        <Check aria-hidden /> Enviar respuestas
      </Button>
      {answered < items.length ? <p className="text-xs text-muted-foreground">Respondé todas las preguntas para poder enviar. No hay respuestas correctas ni incorrectas.</p> : null}
    </div>
  );
}
