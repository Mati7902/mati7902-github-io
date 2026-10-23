import type { Metadata } from "next";
import Link from "next/link";
import { Heart, Plus } from "lucide-react";

import { MoodChart } from "@/components/emotions/mood-chart";
import { MoodTrendChart } from "@/components/emotions/mood-trend-chart";
import { EmotionalLogList } from "@/components/emotions/emotional-log-list";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { emotionLabel } from "@/lib/config/site";
import { requirePatient } from "@/lib/auth/session";
import { toDateKey } from "@/lib/dates";
import { dailyMood } from "@/lib/mood";
import { createClient } from "@/lib/supabase/server";
import { getSetting } from "@/server/services/settings";
import { emotionFrequency, listEmotionalLogs, listMoodEntries, toMoodSeries } from "@/server/services/emotional-logs";

export const metadata: Metadata = { title: "Cómo me siento" };

export default async function EmotionalLogsPage() {
  const { patient } = await requirePatient();
  const supabase = await createClient();
  const [logs, moodEntries, scheduling] = await Promise.all([listEmotionalLogs(supabase, patient.id), listMoodEntries(supabase, patient.id, 90), getSetting(supabase, "scheduling")]);
  const tz = scheduling.timezone;
  const moodDays = dailyMood(moodEntries, tz);
  const series = toMoodSeries(logs);
  const frequent = emotionFrequency(logs).slice(0, 3);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Registro emocional"
        title="Cómo me siento"
        description="Un espacio privado para notar lo que sentís. Sin juicios, sin diagnósticos."
        actions={
          <Button asChild>
            <Link href="/app/registro/nuevo">
              <Plus aria-hidden /> Nuevo registro
            </Link>
          </Button>
        }
      />
      {logs.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="Todavía no hay registros"
          description="Registrar cómo te sentís lleva menos de un minuto y ayuda a ver patrones con el tiempo."
          action={
            <Button asChild>
              <Link href="/app/registro/nuevo">Registrar cómo me siento</Link>
            </Button>
          }
        />
      ) : (
        <>
          <section className="surface-card space-y-4 p-5" aria-labelledby="animo-titulo">
            <div className="space-y-1">
              <h2 id="animo-titulo" className="font-display text-xl font-medium">Tu ánimo</h2>
              <p className="text-sm text-muted-foreground">Cada punto es el ánimo de un día. Los días bajos también son información valiosa: no hace falta que la línea siempre suba.</p>
            </div>
            <MoodTrendChart days={moodDays} today={toDateKey(new Date(), tz)} />
          </section>
          <section className="surface-card space-y-4 p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display text-xl font-medium">Intensidad de las emociones</h2>
              {frequent.length > 0 ? (
                <p className="text-sm text-muted-foreground">Más frecuentes: {frequent.map((f) => emotionLabel(f.key).toLowerCase()).join(", ")}</p>
              ) : null}
            </div>
            <MoodChart data={series} />
          </section>
          <EmotionalLogList logs={logs} />
        </>
      )}
    </div>
  );
}
