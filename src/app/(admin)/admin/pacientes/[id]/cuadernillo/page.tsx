import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { GenerateDraftButton } from "@/components/workbook/generate-draft-button";
import { WorkbookEditor } from "@/components/workbook/workbook-editor";
import { PageHeader } from "@/components/ui/page-header";
import { requireAdmin } from "@/lib/auth/session";
import { COLLECTIONS } from "@/lib/exercises/collections";
import { createClient } from "@/lib/supabase/server";
import { getAdminWorkbook } from "@/server/services/workbooks";

export const metadata: Metadata = { title: "Cuadernillo del paciente" };

export default async function PatientWorkbookPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: patient }, { data: intake }, workbook, { data: templates }] = await Promise.all([
    supabase.from("patients").select("id, first_name, last_name").eq("id", id).maybeSingle(),
    supabase.from("patient_intakes").select("submitted_at").eq("patient_id", id).maybeSingle(),
    getAdminWorkbook(supabase, id),
    supabase.from("exercise_templates").select("slug, title, estimated_minutes, collection").eq("is_active", true).order("sort_order"),
  ]);
  if (!patient) notFound();
  const options = (templates ?? []).map((t) => ({ slug: t.slug, title: t.title, minutes: t.estimated_minutes, group: (t.collection && COLLECTIONS[t.collection]?.title) || "Ejercicios" }));

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <Link href={`/admin/pacientes/${id}`} className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> {patient.first_name} {patient.last_name}
      </Link>
      <PageHeader
        eyebrow="Cuadernillo personalizado"
        title={`Cuadernillo de ${patient.first_name}`}
        description="Borrador armado con reglas a partir de la ficha de ingreso. No diagnostica: sugiere material de la biblioteca y te muestra por qué. El paciente lo ve recién cuando lo aprobás."
      />
      {workbook ? (
        <WorkbookEditor
          key={workbook.latest.version}
          patientId={id}
          workbookId={workbook.id}
          version={workbook.latest.version}
          publishedVersion={workbook.publishedVersion}
          content={workbook.latest.content}
          sources={workbook.latest.sources}
          templates={options}
          history={workbook.history}
        />
      ) : intake?.submitted_at ? (
        <div className="space-y-3 rounded-2xl border border-dashed border-border bg-card/60 p-6">
          <p>Todavía no hay cuadernillo para este paciente.</p>
          <GenerateDraftButton patientId={id} />
        </div>
      ) : (
        <p className="rounded-2xl bg-surface-muted px-4 py-3 text-sm text-muted-foreground">El borrador se arma solo cuando el paciente envía la ficha de ingreso.</p>
      )}
    </div>
  );
}
