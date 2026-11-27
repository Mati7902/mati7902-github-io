import type { Metadata } from "next";
import Link from "next/link";
import { CalendarPlus } from "lucide-react";

import { AppointmentCard } from "@/components/appointments/appointment-card";
import { ConsentCard } from "@/components/consent/consent-card";
import { IntakeCard } from "@/components/intake/intake-card";
import { PatientAppointmentActions } from "@/components/appointments/patient-appointment-actions";
import { QuickMoodCard } from "@/components/emotions/quick-mood-card";
import { QuickActions } from "@/components/patient/quick-actions";
import { TodoCard, type TodoItem } from "@/components/patient/todo-card";
import { exerciseHref } from "@/components/exercises/exercise-card";
import { listPatientAssignments } from "@/server/services/exercises";
import { resolveTestDefs } from "@/server/services/custom-tests";
import { getWorkbookProgress } from "@/server/services/workbooks";
import { formatCompactDate } from "@/lib/dates";
import { InstallApp } from "@/components/pwa/install-app";
import { TodayCard } from "@/components/progress/today-card";
import { Button } from "@/components/ui/button";
import { requirePatient } from "@/lib/auth/session";
import { toDateKey, zonedToUtc } from "@/lib/dates";
import { answeredCount } from "@/lib/intake/form";
import { createClient } from "@/lib/supabase/server";
import { canPatientModify, canPrepareSession, getNextAppointment } from "@/server/services/appointments";
import { getLatestConsent } from "@/server/services/consent";
import { getIntake, intakeAnswersOf } from "@/server/services/intake";
import { getPublicSettingsSafe } from "@/server/services/public-settings";
import { getSessionPreparation } from "@/server/services/session-prep";
import { getPatientProgress, nextSuggestedPractice } from "@/server/services/progress";
import { getSettings } from "@/server/services/settings";

export const metadata: Metadata = { title: "Inicio" };

function greeting(hour: number): string {
  if (hour < 12) return "Buen día";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

export default async function PatientHomePage() {
  const { patient } = await requirePatient();
  const supabase = await createClient();
  const [next, settings, suggestion, intake, publicSettings, consent] = await Promise.all([
    getNextAppointment(supabase, patient.id),
    getSettings(supabase, ["scheduling", "gamification", "treatment_consent"] as const),
    nextSuggestedPractice(supabase, patient.id),
    // Si la ficha no se puede leer, el inicio igual tiene que cargar (no se muestra el aviso).
    getIntake(supabase, patient.id).catch(() => undefined),
    getPublicSettingsSafe(),
    getLatestConsent(supabase, patient.id).catch(() => undefined),
  ]);
  const todayStart = zonedToUtc(toDateKey(new Date(), settings.scheduling.timezone), "00:00", settings.scheduling.timezone).toISOString();
  const { data: todayMoodRow } = await supabase
    .from("emotional_logs")
    .select("mood")
    .eq("patient_id", patient.id)
    .not("mood", "is", null)
    .gte("logged_at", todayStart)
    .order("logged_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  // Todo lo sugerido por el profesional, junto: ejercicios, lecturas, cuestionarios y cuadernillo.
  const [assignments, { data: matRows }, { data: testRows }, workbookProgress] = await Promise.all([
    listPatientAssignments(supabase, patient.id),
    supabase.from("patient_materials").select("material_id, note, completed_at, materials(title)").eq("patient_id", patient.id).not("assigned_by", "is", null).is("completed_at", null).order("assigned_at"),
    supabase.from("test_assignments").select("id, test_id, due_on").eq("patient_id", patient.id).eq("status", "pending").order("assigned_at"),
    getWorkbookProgress(supabase, patient.id, true).catch(() => null),
  ]);
  const testDefs = await resolveTestDefs(supabase, (testRows ?? []).map((t) => t.test_id));
  const todo: TodoItem[] = [
    ...(testRows ?? []).map((t) => ({ kind: "test" as const, title: testDefs.get(t.test_id)?.full ?? "Cuestionario", href: `/app/tests/${t.id}`, due: t.due_on ? formatCompactDate(`${t.due_on}T12:00:00Z`, "UTC") : null })),
    ...assignments
      .filter((a) => !a.completed_at && a.exercise_templates)
      .map((a) => ({ kind: "ejercicio" as const, title: a.exercise_templates!.title, href: `${exerciseHref(a.exercise_templates!)}?asignacion=${a.id}`, note: a.note, due: a.due_at ? formatCompactDate(a.due_at, settings.scheduling.timezone) : null })),
    ...(matRows ?? []).map((m) => ({ kind: "material" as const, title: (m.materials as { title: string } | null)?.title ?? "Material", href: `/app/materiales/${m.material_id}`, note: m.note })),
    ...(workbookProgress && workbookProgress.prompts > workbookProgress.answered
      ? [{ kind: "cuadernillo" as const, title: `Mi cuadernillo: ${workbookProgress.answered} de ${workbookProgress.prompts} respondidas`, href: "/app/cuadernillo" }]
      : []),
  ];
  // Primero el consentimiento; la ficha de ingreso se ofrece una vez firmado.
  const consentSettings = settings.treatment_consent;
  const needsConsent = consentSettings.enabled && consent !== undefined && consent?.version !== consentSettings.version;
  const consentPending = consentSettings.enabled && consent === null;
  const prep = next ? await getSessionPreparation(supabase, next.id) : null;
  const tz = settings.scheduling.timezone;
  // Si Mi Progreso falla, el inicio carga igual (sin la tarjeta).
  const progress = await getPatientProgress(supabase, patient.id, { tz, todayKey: toDateKey(new Date(), tz), globalEnabled: settings.gamification.enabled }).catch(() => null);
  const hour = Number(new Intl.DateTimeFormat("es-PY", { hour: "numeric", hour12: false, timeZone: tz }).format(new Date()));
  const canPrepare = next ? canPrepareSession(next, settings.scheduling) : false;

  return (
    <div className="space-y-10">
      <header className="space-y-1">
        <p className="text-sm text-muted-foreground">{greeting(hour)}</p>
        <h1 className="font-display text-3xl font-medium sm:text-4xl">Hola, {patient.first_name}.</h1>
        <p className="text-lg text-muted-foreground">¿Cómo estás hoy?</p>
      </header>

      {!needsConsent ? <QuickMoodCard todayMood={todayMoodRow?.mood ?? null} /> : null}

      {progress?.enabled && !needsConsent ? <TodayCard summary={progress.summary} paused={progress.paused} goals={progress.goals} suggestion={suggestion} /> : null}

      {needsConsent ? <ConsentCard updated={consent !== null} sessions={consentSettings.sessions} /> : null}

      {!consentPending && intake !== undefined && !intake?.submitted_at ? (
        <IntakeCard answered={answeredCount(intakeAnswersOf(intake))} started={Boolean(intake)} professionalName={publicSettings["site.identity"].professional_name} />
      ) : null}

      {!needsConsent ? <TodoCard items={todo} /> : null}

      {next ? (
        <AppointmentCard
          appointment={next}
          timezone={tz}
          emphasis
          showAccess
          actions={
            <PatientAppointmentActions
              appointment={next}
              canConfirm={next.status === "pending" || next.status === "rescheduled"}
              canReschedule={canPatientModify(next, settings.scheduling, "reschedule")}
              canCancel={canPatientModify(next, settings.scheduling, "cancel")}
              canPrepare={canPrepare}
              prepared={Boolean(prep?.submitted_at)}
            />
          }
        />
      ) : (
        <div className="rounded-3xl border border-dashed border-border bg-card/60 p-6 text-center">
          <p className="font-display text-xl font-medium">No tenés ninguna sesión programada.</p>
          <p className="mt-1 text-sm text-muted-foreground">Cuando quieras, podés pedir un horario.</p>
          <Button asChild className="mt-4">
            <Link href="/app/agenda/nuevo">
              <CalendarPlus aria-hidden /> Solicitar turno
            </Link>
          </Button>
        </div>
      )}

      <QuickActions prepareHref={canPrepare && next ? `/app/preparar-sesion/${next.id}` : null} />

      <InstallApp dismissible />

    </div>
  );
}
