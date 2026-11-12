import { INTAKE_QUESTIONS, intakeAge, isPlainNegative, type IntakeAnswers } from "@/lib/intake/form";

/**
 * Lo que se le envía a la IA para redactar el cuadernillo: la ficha SIN datos que identifiquen
 * a la persona (nombre, teléfono, contacto de emergencia, fecha de nacimiento, lugar de
 * residencia). Va la edad en años. Las respuestas vacías o negativas («no», «nada») se omiten.
 */
const IDENTIFYING = new Set(["nombre", "telefono", "contacto_emergencia", "fecha_nacimiento", "edad", "residencia"]);

export function deidentifiedIntake(answers: IntakeAnswers): { age: number | null; lines: string[] } {
  const lines: string[] = [];
  for (const q of INTAKE_QUESTIONS) {
    if (IDENTIFYING.has(q.id) || !("label" in q)) continue;
    const v = answers[q.id];
    if (v === undefined || v === null || v === "") continue;
    if (typeof v === "object") continue;
    const text = String(v).trim();
    if (!text || isPlainNegative(text)) continue;
    lines.push(`- ${q.label}: ${text.slice(0, 1500)}`);
  }
  return { age: intakeAge(answers), lines };
}
