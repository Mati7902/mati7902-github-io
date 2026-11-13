"use client";

import { ArrowLeft, ArrowRight, BookOpen, Heart, HeartPulse, Sparkles, Wind, type LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

const KEY = "recorrido-visto";
export const OPEN_TOUR_EVENT = "abrir-recorrido";

const STEPS: { icon: LucideIcon; tone: string; title: string; text: string }[] = [
  { icon: Heart, tone: "bg-primary-soft text-primary", title: "Este es tu espacio", text: "Acá registrás cómo te sentís, practicás lo que trabajamos en sesión y ves tus turnos. Lo que escribís es privado." },
  { icon: Wind, tone: "bg-mint-100 text-mint-700", title: "Calmarme, siempre a mano", text: "El botón verde de abajo a la derecha te lleva a respiraciones y recursos para un momento difícil, desde cualquier pantalla." },
  { icon: Sparkles, tone: "bg-warning-soft text-warning-strong", title: "Ejercicios y cuadernillo", text: "En Ejercicios están las prácticas que te asigna tu psicólogo y tu cuadernillo personalizado. A tu ritmo: no hay respuestas incorrectas." },
  { icon: HeartPulse, tone: "bg-success-soft text-mint-700", title: "Hábitos y progreso", text: "Moverte, descansar y comer con regularidad también cuida la salud mental. En Progreso ves lo que vas logrando, sin rachas que castigan." },
  { icon: BookOpen, tone: "bg-info-soft text-info-strong", title: "A tu medida", text: "En Perfil podés agrandar la letra, activar el modo oscuro, escuchar los textos en voz alta y elegir recordatorios suaves en el celular." },
];

/** Recorrido de bienvenida: se muestra una vez por dispositivo y se puede volver a ver desde Perfil. */
export function WelcomeTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    let seen = true;
    try {
      seen = Boolean(localStorage.getItem(KEY));
    } catch {
      // Sin almacenamiento: no se muestra, para no repetirlo en cada visita.
    }
    const show = () => {
      setStep(0);
      setOpen(true);
    };
    if (!seen) {
      const t = window.setTimeout(show, 400);
      window.addEventListener(OPEN_TOUR_EVENT, show);
      return () => {
        window.clearTimeout(t);
        window.removeEventListener(OPEN_TOUR_EVENT, show);
      };
    }
    window.addEventListener(OPEN_TOUR_EVENT, show);
    return () => window.removeEventListener(OPEN_TOUR_EVENT, show);
  }, []);

  const close = () => {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      // Sin almacenamiento.
    }
    setOpen(false);
  };

  const s = STEPS[step]!;
  const last = step === STEPS.length - 1;
  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
      <DialogContent className="max-w-md">
        <div className="flex flex-col items-center gap-4 pt-2 text-center">
          <span className={`flex size-14 items-center justify-center rounded-2xl ${s.tone}`}>
            <s.icon className="size-7" aria-hidden />
          </span>
          <DialogTitle className="font-display text-2xl font-medium">{s.title}</DialogTitle>
          <DialogDescription className="text-base">{s.text}</DialogDescription>
          <div className="flex gap-1.5" aria-label={`Paso ${step + 1} de ${STEPS.length}`}>
            {STEPS.map((_, i) => (
              <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? "w-6 bg-primary" : "w-1.5 bg-border"}`} />
            ))}
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          {step > 0 ? (
            <Button type="button" variant="ghost" onClick={() => setStep(step - 1)}>
              <ArrowLeft aria-hidden /> Atrás
            </Button>
          ) : (
            <Button type="button" variant="ghost" onClick={close}>
              Saltar
            </Button>
          )}
          <Button type="button" onClick={() => (last ? close() : setStep(step + 1))}>
            {last ? "Empezar" : "Siguiente"} {last ? null : <ArrowRight aria-hidden />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ReplayTourButton() {
  return (
    <Button type="button" variant="outline" onClick={() => window.dispatchEvent(new Event(OPEN_TOUR_EVENT))}>
      Ver el recorrido de bienvenida
    </Button>
  );
}
