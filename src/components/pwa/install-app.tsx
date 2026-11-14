"use client";

import { Download, Share, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
const DISMISS_KEY = "instalar-oculto";

/**
 * Invita a instalar la app en la pantalla de inicio. En Android/Chrome usa el diálogo del navegador;
 * en iPhone explica los dos toques. No aparece si ya está instalada.
 */
export function InstallApp({ dismissible = false }: { dismissible?: boolean }) {
  const [mode, setMode] = useState<"hidden" | "prompt" | "ios" | "manual">("hidden");
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) return;
    try {
      if (dismissible && localStorage.getItem(DISMISS_KEY)) return;
    } catch {
      // Sin almacenamiento: se muestra.
    }
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallPrompt);
      setMode("prompt");
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    const t = window.setTimeout(() => setMode((m) => (m === "hidden" ? (ios ? "ios" : dismissible ? "hidden" : "manual") : m)), 600);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.clearTimeout(t);
    };
  }, [dismissible]);

  if (mode === "hidden") return null;
  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Sin almacenamiento: se oculta solo en esta visita.
    }
    setMode("hidden");
  };

  return (
    <div className="surface-card relative flex items-start gap-4 p-5">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
        <Download className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1 space-y-2">
        <p className="font-display text-lg font-medium">Tené la app en tu celular</p>
        {mode === "prompt" ? (
          <>
            <p className="text-sm text-muted-foreground">Queda con su ícono en la pantalla de inicio, se abre más rápido y te puede avisar de tus turnos.</p>
            <Button
              type="button"
              size="sm"
              onClick={async () => {
                if (!prompt) return;
                await prompt.prompt();
                const choice = await prompt.userChoice;
                if (choice.outcome === "accepted") setMode("hidden");
              }}
            >
              Instalar
            </Button>
          </>
        ) : mode === "ios" ? (
          <p className="text-sm text-muted-foreground">
            En Safari tocá <Share className="inline size-4 align-text-bottom" aria-label="Compartir" /> <b>Compartir</b> y después <b>Agregar a pantalla de inicio</b>. Queda con su ícono, como cualquier app.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Desde el menú del navegador elegí <b>Instalar app</b> o <b>Agregar a pantalla de inicio</b>.</p>
        )}
      </div>
      {dismissible ? (
        <button type="button" onClick={dismiss} className="absolute top-2 right-2 inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-muted" aria-label="Ocultar">
          <X className="size-4" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
