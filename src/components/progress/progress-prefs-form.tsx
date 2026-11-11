"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { updateProgressPrefsAction } from "@/server/actions/progress";

const selectClass = "h-11 rounded-xl border border-input bg-card px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30";

/** Meta semanal ajustable, pausa y opción de no ver insignias. Todo lo decide el paciente. */
export function ProgressPrefsForm({ weeklyGoal, badgesEnabled, paused }: { weeklyGoal: number; badgesEnabled: boolean; paused: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [goal, setGoal] = useState(weeklyGoal);
  const [badges, setBadges] = useState(badgesEnabled);
  const [pauseWeeks, setPauseWeeks] = useState(0);

  const save = (extra: { resume?: boolean; pauseWeeks?: number } = {}) =>
    startTransition(async () => {
      const res = await updateProgressPrefsAction({ weeklyGoal: goal, badgesEnabled: badges, ...extra });
      if (!res.ok) return void toast.error(res.error);
      toast.success(extra.resume ? "Retomaste tus metas." : extra.pauseWeeks ? "Metas en pausa. Nada se pierde." : "Listo, guardado.");
      router.refresh();
    });

  return (
    <div className="space-y-5">
      <label className="grid gap-1.5 text-sm">
        <span className="font-medium">Meta de prácticas por semana</span>
        <select value={goal} onChange={(e) => setGoal(Number(e.target.value))} className={selectClass}>
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <option key={n} value={n}>
              {n} {n === 1 ? "práctica" : "prácticas"}
            </option>
          ))}
        </select>
        <span className="text-xs text-muted-foreground">Podés bajarla cuando quieras. Una meta chica que se cumple ayuda más que una grande.</span>
      </label>
      <label className="flex items-center gap-3 text-sm">
        <Switch checked={badges} onCheckedChange={setBadges} aria-label="Mostrar insignias" /> Mostrar insignias
      </label>
      <Button type="button" onClick={() => save()} loading={pending}>
        Guardar
      </Button>

      <div className="space-y-2 border-t border-divider pt-5">
        <p className="text-sm font-medium">Pausar mis metas</p>
        {paused ? (
          <Button type="button" variant="outline" onClick={() => save({ resume: true })} disabled={pending}>
            Retomar ahora
          </Button>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <select value={pauseWeeks} onChange={(e) => setPauseWeeks(Number(e.target.value))} className={selectClass} aria-label="Tiempo de pausa">
              <option value={0}>Elegí cuánto tiempo…</option>
              <option value={1}>1 semana</option>
              <option value={2}>2 semanas</option>
              <option value={4}>4 semanas</option>
            </select>
            <Button type="button" variant="outline" onClick={() => save({ pauseWeeks })} disabled={pending || pauseWeeks === 0}>
              Pausar
            </Button>
          </div>
        )}
        <p className="text-xs text-muted-foreground">En pausa no se muestra la meta. Lo que ya lograste queda guardado.</p>
      </div>
    </div>
  );
}
