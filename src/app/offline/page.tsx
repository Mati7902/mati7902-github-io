import type { Metadata } from "next";
import { WifiOff } from "lucide-react";

import { BreathingExercise } from "@/components/calm/breathing-exercise";

export const metadata: Metadata = { title: "Sin conexión", robots: { index: false } };

/**
 * Página que muestra el service worker cuando no hay red. Queda guardada en el dispositivo con
 * todo lo necesario para respirar y hacer un ejercicio de anclaje sin internet.
 */
export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center gap-8 px-4 py-10 text-center">
      <div className="flex flex-col items-center gap-3">
        <span className="flex size-14 items-center justify-center rounded-full bg-primary-soft text-primary">
          <WifiOff className="size-6" aria-hidden />
        </span>
        <h1 className="font-display text-3xl font-medium">Sin conexión</h1>
        <p className="max-w-sm text-muted-foreground">No hay internet en este momento. Cuando vuelva, recargá la página y seguimos. Mientras tanto, esto funciona igual:</p>
      </div>

      <section className="w-full space-y-4">
        <h2 className="font-display text-2xl font-medium">Respiración 4-6</h2>
        <BreathingExercise title="Respiración sin conexión" config={{ pattern: { inhale: 4, hold: 0, exhale: 6, hold_after: 0 }, durations: [1, 3, 5] }} />
      </section>

      <section className="surface-card w-full space-y-3 p-5 text-left">
        <h2 className="font-display text-xl font-medium">Anclaje 5-4-3-2-1</h2>
        <p className="text-sm text-muted-foreground">Para volver al presente cuando la angustia sube. Nombrá en voz baja o mentalmente:</p>
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          <li><b>5</b> cosas que ves.</li>
          <li><b>4</b> cosas que podés tocar.</li>
          <li><b>3</b> sonidos que escuchás.</li>
          <li><b>2</b> olores.</li>
          <li><b>1</b> sabor, o algo amable que te dirías.</li>
        </ol>
        <p className="text-sm text-muted-foreground">Si estás en peligro o sentís que no podés mantenerte a salvo, buscá ayuda presencial o llamá a emergencias de tu zona.</p>
      </section>
    </main>
  );
}
