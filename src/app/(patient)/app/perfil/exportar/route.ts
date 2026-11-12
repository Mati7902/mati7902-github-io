import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { audit } from "@/server/services/audit";
import { allowAttempt } from "@/server/services/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Copia de los datos propios en JSON (derecho de acceso y portabilidad). Usa la sesión del
 * paciente, así que solo sale lo que sus permisos (RLS) le dejan ver: nunca el diagnóstico,
 * las notas del profesional ni resultados de tests no habilitados.
 */
export async function GET() {
  const session = await getSession();
  if (!session?.patient) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(await allowAttempt(`export:${session.userId}`, 5, 3600))) return NextResponse.json({ error: "Probá de nuevo en un rato." }, { status: 429 });

  const supabase = await createClient();
  const id = session.patient.id;
  const [appointments, logs, responses, intake, consents, assignments, tests, results, materials, preparations] = await Promise.all([
    supabase.from("appointments").select("start_time, end_time, modality, status, location, patient_note, created_at").eq("patient_id", id).order("start_time"),
    supabase.from("emotional_logs").select("*").eq("patient_id", id).order("created_at"),
    supabase.from("exercise_responses").select("*, exercise_templates(title, slug)").eq("patient_id", id).order("created_at"),
    supabase.from("patient_intakes").select("*").eq("patient_id", id),
    supabase.from("treatment_consents").select("*").eq("patient_id", id),
    supabase.from("exercise_assignments").select("*, exercise_templates(title, slug)").eq("patient_id", id),
    supabase.from("test_assignments").select("test_id, status, assigned_at, due_on, completed_at").eq("patient_id", id),
    supabase.from("test_responses").select("*").eq("patient_id", id),
    supabase.from("patient_materials").select("assigned_at, materials(title)").eq("patient_id", id),
    supabase.from("session_preparations").select("*").eq("patient_id", id),
  ]);

  const data = {
    generado: new Date().toISOString(),
    nota: "Copia de tus datos en la plataforma. No incluye las notas clínicas del profesional, que forman parte de la historia clínica y se solicitan directamente a él.",
    cuenta: { email: session.email },
    ficha: session.patient,
    turnos: appointments.data ?? [],
    registros_emocionales: logs.data ?? [],
    ejercicios_asignados: assignments.data ?? [],
    respuestas_de_ejercicios: responses.data ?? [],
    ficha_de_ingreso: intake.data ?? [],
    consentimientos: consents.data ?? [],
    tests_asignados: tests.data ?? [],
    resultados_de_tests_habilitados: results.data ?? [],
    materiales: materials.data ?? [],
    preparacion_de_sesiones: preparations.data ?? [],
  };
  await audit(supabase, "patient.data_exported", { type: "patient", id });

  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="mis-datos-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
