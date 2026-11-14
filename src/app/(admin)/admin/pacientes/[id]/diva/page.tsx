import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { DivaConsole } from "@/components/admin/diva/diva-console";
import { PageHeader } from "@/components/ui/page-header";
import { requireAdmin } from "@/lib/auth/session";
import { toDateKey } from "@/lib/dates";
import { parseDivaContent } from "@/lib/diva";
import { createClient } from "@/lib/supabase/server";
import { getSetting } from "@/server/services/settings";

export const metadata: Metadata = { title: "Entrevista DIVA-5", robots: { index: false } };

export default async function DivaPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const [{ data: patient }, { data: row }, scheduling] = await Promise.all([
    supabase.from("patients").select("id, first_name, last_name").eq("id", id).maybeSingle(),
    supabase.from("instrument_content").select("content").eq("key", "diva-5").maybeSingle(),
    getSetting(supabase, "scheduling"),
  ]);
  if (!patient) notFound();
  const content = parseDivaContent(row?.content ?? null);

  return (
    <div className="space-y-6">
      <Link href={`/admin/pacientes/${patient.id}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> Ficha de {patient.first_name}
      </Link>
      <PageHeader eyebrow="Evaluación · TDAH en adultos" title={`Entrevista DIVA-5 · ${patient.first_name} ${patient.last_name}`} description="Explorá la edad adulta y la infancia (5–12 años). Al marcar un ejemplo, el síntoma pasa a «Sí»; podés cambiarlo. Nada se guarda hasta que toques «Guardar en la ficha»." />
      {content ? (
        <DivaConsole content={content} patientId={patient.id} patientName={patient.first_name} todayKey={toDateKey(new Date(), scheduling.timezone)} />
      ) : (
        <p className="rounded-2xl bg-warning-soft px-4 py-3 text-sm">Falta cargar el contenido de la DIVA-5 en tu base de datos. Corré el paso «Cargar DIVA-5» de la página de actualización y volvé a abrir esta pantalla.</p>
      )}
    </div>
  );
}
