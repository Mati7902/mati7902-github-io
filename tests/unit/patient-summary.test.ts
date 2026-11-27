import { describe, expect, it } from "vitest";

import { summarizePatient, type SummaryInput } from "@/lib/patient-summary";

const now = new Date("2026-11-27T12:00:00Z");
const base = (over: Partial<SummaryInput> = {}): SummaryInput => ({ now, exercises: [], materials: [], tests: [], workbook: null, appointments: [], lastSeenAt: null, shared: null, ...over });

describe("Resumen del paciente", () => {
  it("separa lo hecho de lo pendiente y calcula la adherencia", () => {
    const s = summarizePatient(
      base({
        exercises: [
          { title: "RPD", assigned_at: "2026-11-19T10:00:00Z", due_at: null, completed_at: "2026-11-20T10:00:00Z" },
          { title: "Grounding", assigned_at: "2026-11-25T10:00:00Z", due_at: "2026-11-26T10:00:00Z", completed_at: null },
        ],
        materials: [
          { title: "Pánico", assigned_at: "2026-11-19T10:00:00Z", viewed_at: "2026-11-21T10:00:00Z", completed_at: null },
          { title: "Sueño", assigned_at: "2026-11-19T10:00:00Z", viewed_at: null, completed_at: null },
        ],
        tests: [{ name: "PHQ-9", status: "pending", assigned_at: "2026-11-20T10:00:00Z", due_on: null, completed_at: null }],
        lastSeenAt: "2026-11-26T10:00:00Z",
      }),
    );
    expect(s.done.map((d) => d.title)).toEqual(["Pánico", "RPD"]);
    expect(s.pending[0]).toMatchObject({ title: "Grounding", overdue: true });
    expect(s.adherence).toBe(40);
    expect(s.flags).toEqual(["1 tarea vencida"]);
    expect(s.daysSinceActivity).toBe(1);
  });

  it("asistencia, ánimo en baja y sin actividad", () => {
    const s = summarizePatient(
      base({
        appointments: [
          { start_time: "2026-11-10T12:00:00Z", status: "completed" },
          { start_time: "2026-11-03T12:00:00Z", status: "no_show" },
          { start_time: "2026-10-27T12:00:00Z", status: "no_show" },
          { start_time: "2026-12-04T12:00:00Z", status: "confirmed" },
        ],
        lastSeenAt: "2026-11-01T10:00:00Z",
        shared: { moodDays: [{ day: "2026-11-25", mood: 3 }, { day: "2026-11-05", mood: 7 }], lastPracticeAt: null },
      }),
    );
    expect(s.sessions).toEqual({ attended: 1, missed: 2, cancelled: 0, attendance: 33 });
    expect(s.mood).toEqual({ recent: 3, previous: 7 });
    expect(s.flags).toEqual(["Sin actividad hace 26 días", "2 ausencias en 90 días", "Ánimo en baja: 7 → 3"]);
  });

  it("sin registros compartidos no informa ánimo", () => {
    expect(summarizePatient(base()).mood).toBeNull();
    expect(summarizePatient(base()).flags).toContain("Nunca entró a la app");
  });
});
