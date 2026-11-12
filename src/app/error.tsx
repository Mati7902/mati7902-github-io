"use client";

import { useEffect } from "react";

import { reportTech } from "@/components/shell/telemetry";
import { Button } from "@/components/ui/button";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[app-error]", error.digest ?? error.message);
    // Solo se avisa que hubo un error y en qué tipo de página; el detalle queda en los logs del servidor.
    reportTech("error", 1);
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="font-display text-3xl font-medium">Algo no salió como esperábamos</h1>
      <p className="max-w-md text-muted-foreground">
        Ya quedó registrado. Podés intentar de nuevo; si el problema sigue, escribinos y lo resolvemos.
      </p>
      <Button onClick={reset}>Intentar de nuevo</Button>
    </main>
  );
}
