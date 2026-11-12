import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { GenerateDraftButton } from "@/components/workbook/generate-draft-button";
import { WorkbookEditor } from "@/components/workbook/workbook-editor";
import { PageHeader } from "@/components/ui/page-header";
import { requireAdmin } from "@/lib/auth/session";
import { COLLECTIONS } from "@/lib/exercises/collections";
import { formatWorkbookAnswer } from "@/lib/workbook/rules";
import { createClient } from "@/lib/supabase/server";
import { isWorkbookAIConfigured } from "@/server/services/ai/workbook-writer";
import { getAdminWorkbook } from "@/server/services/workbooks";

// Redactar el cuadernillo con IA puede llevar unos minutos.
export const maxDuration = 300;

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
  // Lo que completó el paciente (RLS: solo si comparte sus registros).
  const { data: answerRows } = workbook ? await supabase.from("workbook_answers").select("prompt_key, answer, updated_at").eq("workbook_id", workbook.id) : { data: [] };
  const answers = new Map((answerRows ?? []).map((a) => [a.prompt_key, a.answer]));
  const publishedChapters = workbook?.latest.content.chapters ?? [];
  const options = (templates ?? []).map((t) => ({ slug: t.slug, title: t.title, minutes: t.estimated_minutes, group: (t.collection && COLLECTIONS[t.collection]?.title) || "Ejercicios" }));

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <Link href={`/admin/pacientes/${id}`} className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> {patient.first_name} {patient.last_name}
      </Link>
      <PageHeader
        eyebrow="Cuadernillo personalizado"
        title={`Cuadernillo de ${patient.first_name}`}
        description={isWorkbookAIConfigured() ? "Al enviar la ficha de ingreso, la IA redacta un cuadernillo para esta persona (sin su nombre ni datos de contacto). Lo revisás, lo corregís y lo aprobás: el paciente lo ve recién entonces." : "Borrador armado con reglas a partir de la ficha de ingreso. Para que lo redacte la IA, cargá ANTHROPIC_API_KEY en Vercel. El paciente lo ve recién cuando lo aprobás."}
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
          aiAvailable={isWorkbookAIConfigured()}
        />
      ) : null}
      {workbook && answers.size > 0 ? (
        <section className="space-y-4" aria-labelledby="respuestas-cuadernillo">
          <h2 id="respuestas-cuadernillo" className="font-display text-xl font-medium">Lo que completó el paciente ({answers.size})</h2>
          {publishedChapters.map((ch) => {
            const rows = ch.prompts.filter((p) => answers.has(p.key));
            if (!rows.length) return null;
            return (
              <div key={ch.key} className="surface-card space-y-3 p-5">
                <p className="font-medium">{ch.title}</p>
                <dl className="space-y-3 text-sm">
                  {rows.map((p) => (
                    <div key={p.key}>
                      <dt className="text-muted-foreground">{p.text}</dt>
                      <dd className="mt-0.5 whitespace-pre-wrap">{formatWorkbookAnswer(p, answers.get(p.key)!)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            );
          })}
        </section>
      ) : null}
      {workbook ? null : intake?.submitted_at ? (
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
