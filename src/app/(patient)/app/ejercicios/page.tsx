import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookMarked, Sparkles } from "lucide-react";

import { CollectionCard } from "@/components/exercises/collection-card";
import { APPROACH_LABEL, ExerciseCard, exerciseHref } from "@/components/exercises/exercise-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { requirePatient } from "@/lib/auth/session";
import { ageFrom, audiencesFor, COLLECTIONS, visibleTemplates } from "@/lib/exercises/collections";
import { createClient } from "@/lib/supabase/server";
import { listExerciseTemplates, listPatientAssignments, listPatientResponses } from "@/server/services/exercises";
import { getMyWorkbook } from "@/server/services/workbooks";
import type { ExerciseTemplate } from "@/types/domain";

export const metadata: Metadata = { title: "Ejercicios" };

const SECTIONS: { approach: ExerciseTemplate["approach"]; title: string; description: string }[] = [
  { approach: "tcc", title: "Ordenar mis pensamientos", description: "Registro cognitivo guiado, una pregunta por vez." },
  { approach: "act", title: "Lo que me importa", description: "Valores, acciones comprometidas y tomar distancia de los pensamientos." },
  { approach: "dbt", title: "Habilidades para momentos difíciles", description: "Herramientas breves para frenar, regular y comunicar." },
  { approach: "regulacion", title: "Regular las emociones", description: "Prácticas para bajar la intensidad y volver al presente." },
  { approach: "general", title: "Otras prácticas", description: "Herramientas para cuidarte y pedir ayuda." },
];

export default async function ExercisesPage({ searchParams }: { searchParams: Promise<{ completado?: string }> }) {
  const { patient } = await requirePatient();
  const { completado } = await searchParams;
  const supabase = await createClient();
  const workbook = await getMyWorkbook(supabase).catch(() => null);
  const [templates, assignments, responses, { data: assignedMaterials }] = await Promise.all([
    listExerciseTemplates(supabase),
    listPatientAssignments(supabase, patient.id),
    listPatientResponses(supabase, patient.id, 100),
    // Materiales que el profesional habilitó y que abren un ejercicio (los recursos de su cuadro).
    supabase.from("patient_materials").select("materials(exercise_template_id)").eq("patient_id", patient.id).not("assigned_by", "is", null),
  ]);
  const pendingAssignments = assignments.filter((a) => !a.completed_at && a.exercise_templates);
  const doneTemplateIds = new Set(responses.map((r) => r.template_id));
  const assignedIds = new Set([
    ...assignments.map((a) => a.template_id),
    ...(assignedMaterials ?? []).map((m) => (m.materials as { exercise_template_id: string | null } | null)?.exercise_template_id).filter((id): id is string => Boolean(id)),
  ]);
  // Lo que se ofrece según la edad (Brújula hasta los 18, el cuadernillo de TCC para adultos) + lo asignado.
  const wizardTemplates = visibleTemplates(
    templates.filter((t) => !["breathing", "grounding", "mindful_pause"].includes(t.kind)),
    audiencesFor(ageFrom(patient.birth_date)),
    assignedIds,
  );
  const collections = Object.entries(COLLECTIONS)
    .map(([key, info]) => {
      const items = wizardTemplates.filter((t) => t.collection === key);
      return { key, info, items, done: items.filter((t) => doneTemplateIds.has(t.id)).length, next: items.find((t) => !doneTemplateIds.has(t.id)) ?? null };
    })
    .filter((c) => c.items.length > 0);
  const loose = wizardTemplates.filter((t) => !t.collection || !COLLECTIONS[t.collection]);

  return (
    <div className="space-y-10">
      <PageHeader eyebrow="Entre sesiones" title="Ejercicios" description="Prácticas breves basadas en TCC, ACT y DBT. Elegí la que necesites hoy." />
      {workbook ? (
        <Link href="/app/cuadernillo" className="surface-card group flex items-center gap-4 border-l-4 border-l-primary p-5 transition-shadow hover:shadow-[var(--shadow-float)]">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <BookMarked className="size-5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-lg font-medium">Mi cuadernillo</span>
            <span className="text-sm text-muted-foreground">{workbook.content.items.length} actividades preparadas para vos.</span>
          </span>
          <ArrowRight className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>
      ) : null}
      {completado ? (
        <Alert variant="success">
          <AlertDescription>Ejercicio guardado. Tomarte este tiempo ya es parte del trabajo.</AlertDescription>
        </Alert>
      ) : null}

      {pendingAssignments.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-display text-xl font-medium">Sugeridos por tu psicólogo</h2>
          <div className="grid gap-3">
            {pendingAssignments.map((a) => (
              <ExerciseCard key={a.id} template={a.exercise_templates!} note={a.note} href={`${exerciseHref(a.exercise_templates!)}?asignacion=${a.id}`} />
            ))}
          </div>
        </section>
      ) : null}

      {collections.length > 0 ? (
        <section className="space-y-3">
          <div>
            <h2 className="font-display text-xl font-medium">{collections.length > 1 ? "Tus cuadernillos" : "Tu cuadernillo"}</h2>
            <p className="text-sm text-muted-foreground">Un recorrido en orden, de a una página por vez. Podés saltear lo que no tenga que ver con vos.</p>
          </div>
          <div className="grid gap-3">
            {collections.map((c) => (
              <CollectionCard key={c.key} collectionKey={c.key} info={c.info} total={c.items.length} done={c.done} next={c.next} />
            ))}
          </div>
        </section>
      ) : null}

      {SECTIONS.map((section) => {
        const items = loose.filter((t) => t.approach === section.approach);
        if (items.length === 0) return null;
        return (
          <section key={section.approach} className="space-y-3">
            <div>
              <h2 className="font-display text-xl font-medium">{section.title}</h2>
              <p className="text-sm text-muted-foreground">
                {section.description} <span className="text-subtle-foreground">· {APPROACH_LABEL[section.approach]}</span>
              </p>
            </div>
            <div className="grid gap-3">
              {items.map((t) => (
                <ExerciseCard key={t.id} template={t} done={doneTemplateIds.has(t.id)} />
              ))}
            </div>
          </section>
        );
      })}

      {wizardTemplates.length === 0 ? <EmptyState icon={Sparkles} title="Todavía no hay ejercicios" description="Pronto vas a encontrar acá prácticas breves para hacer entre sesiones." /> : null}
    </div>
  );
}
