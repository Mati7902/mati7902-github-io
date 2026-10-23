import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { CrisisBanner } from "@/components/calm/crisis-banner";
import { PatientTestForm } from "@/components/patient/patient-test-form";
import { PageHeader } from "@/components/ui/page-header";
import { requirePatient } from "@/lib/auth/session";
import { assignableTest } from "@/lib/clinical/focus";
import { createClient } from "@/lib/supabase/server";
import { getActiveEmergencyResources } from "@/server/services/public-content";
import { getPublicSettingsSafe } from "@/server/services/public-settings";

export const metadata: Metadata = { title: "Cuestionario" };

export default async function PatientTestPage({ params }: { params: Promise<{ id: string }> }) {
  const { patient } = await requirePatient();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data: assignment } = await supabase.from("test_assignments").select("*").eq("id", id).eq("patient_id", patient.id).maybeSingle();
  const def = assignment ? assignableTest(assignment.test_id) : undefined;
  if (!assignment || !def || assignment.status !== "pending") notFound();
  const [resources, settings] = await Promise.all([getActiveEmergencyResources(), getPublicSettingsSafe()]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/app/tests" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> Mis cuestionarios
      </Link>
      <PageHeader eyebrow="Cuestionario" title={def.full} />
      <PatientTestForm
        assignmentId={assignment.id}
        intro={`${def.intro} No hay respuestas correctas ni incorrectas, y no es un diagnóstico: lo revisás con tu psicólogo.`}
        items={def.items.map((i) => i.text)}
        options={def.options}
        crisis={<CrisisBanner settings={settings.emergency} resources={resources} professionalWhatsApp={settings["site.identity"].whatsapp} />}
      />
    </div>
  );
}
