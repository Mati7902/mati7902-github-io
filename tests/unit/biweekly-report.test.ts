import { describe, expect, it } from "vitest";

import { buildBiweeklyReport, periodContaining, periodLabel, previousPeriod, reportDueOn, type ReportInput } from "@/lib/reports/biweekly";

const TZ = "America/Asuncion";

describe("Informe quincenal: períodos", () => {
  it("divide el mes en 1–15 y 16–fin de mes", () => {
    expect(periodContaining("2026-11-03")).toEqual({ start: "2026-11-01", end: "2026-11-15" });
    expect(periodContaining("2026-02-20")).toEqual({ start: "2026-02-16", end: "2026-02-28" });
    expect(previousPeriod("2026-11-16")).toEqual({ start: "2026-11-01", end: "2026-11-15" });
    expect(previousPeriod("2027-01-01")).toEqual({ start: "2026-12-16", end: "2026-12-31" });
    expect(reportDueOn("2026-11-16")).toBe(true);
    expect(reportDueOn("2026-11-17")).toBe(false);
    expect(periodLabel({ start: "2026-11-01", end: "2026-11-15" })).toBe("1 de noviembre al 15 de noviembre de 2026");
  });
});

const base = (over: Partial<ReportInput> = {}): ReportInput => ({
  period: { start: "2026-11-01", end: "2026-11-15" },
  previous: { start: "2026-10-16", end: "2026-10-31" },
  tz: TZ,
  now: new Date("2026-11-16T07:00:00Z"),
  patients: [
    { id: "a", name: "Ana Demo", share: true },
    { id: "b", name: "Beto Demo", share: false },
  ],
  appointments: [],
  moods: [],
  exercises: [],
  habits: [],
  tests: [],
  workbooks: [],
  ...over,
});

describe("Informe quincenal: contenido", () => {
  it("cuenta sesiones, ánimo, práctica y hábitos por pilar", () => {
    const r = buildBiweeklyReport(
      base({
        appointments: [
          { patient_id: "a", start_time: "2026-11-03T13:00:00Z", status: "completed" },
          { patient_id: "a", start_time: "2026-11-10T13:00:00Z", status: "confirmed" },
          { patient_id: "a", start_time: "2026-11-12T13:00:00Z", status: "cancelled" },
          { patient_id: "a", start_time: "2026-11-20T13:00:00Z", status: "confirmed" },
        ],
        moods: [
          { patient_id: "a", logged_at: "2026-11-02T15:00:00Z", mood: 6 },
          { patient_id: "a", logged_at: "2026-11-09T15:00:00Z", mood: 8 },
          { patient_id: "a", logged_at: "2026-10-20T15:00:00Z", mood: 5 },
        ],
        exercises: [{ patient_id: "a", completed_at: "2026-11-05T15:00:00Z" }],
        habits: [
          { patient_id: "a", habit_id: "mov-pausas", logged_on: "2026-11-04" },
          { patient_id: "a", habit_id: "mov-estirar", logged_on: "2026-11-04" },
          { patient_id: "a", habit_id: "mov-pausas", logged_on: "2026-11-05" },
          { patient_id: "a", habit_id: "mov-pausas", logged_on: "2026-11-16" },
        ],
      }),
    );
    const ana = r.patients.find((p) => p.id === "a")!;
    expect(ana.sessions).toEqual({ done: 2, cancelled: 1, noShow: 0, next: "2026-11-20T13:00:00Z" });
    expect(ana.mood).toEqual({ avg: 7, previous: 5, logs: 2 });
    expect(ana.practice).toEqual({ exercises: 1, habitDays: { movimiento: 2, descanso: 0, alimentacion: 0 } });
    expect(ana.alerts).toEqual([]);
    expect(r.totals).toMatchObject({ patients: 2, sessionsDone: 2, cancelled: 1 });
    expect(r.partial).toBe(false);
    expect(buildBiweeklyReport(base({ now: new Date("2026-11-10T15:00:00Z") })).partial).toBe(true);
  });

  it("no incluye registros personales de quien no los comparte", () => {
    const r = buildBiweeklyReport(base({ moods: [{ patient_id: "b", logged_at: "2026-11-02T15:00:00Z", mood: 2 }] }));
    const beto = r.patients.find((p) => p.id === "b")!;
    expect(beto.mood).toBeNull();
    expect(beto.practice).toBeNull();
  });

  it("ordena primero a quien tiene alertas de riesgo", () => {
    const r = buildBiweeklyReport(
      base({
        tests: [{ patient_id: "b", title: "PHQ-9", score: 21, max_score: 27, band_label: "Severa", level: "crit", risk: true, completed_at: "2026-11-08T15:00:00Z" }],
        moods: [
          { patient_id: "a", logged_at: "2026-11-02T15:00:00Z", mood: 3 },
          { patient_id: "a", logged_at: "2026-10-20T15:00:00Z", mood: 7 },
        ],
      }),
    );
    expect(r.patients[0]!.id).toBe("b");
    expect(r.patients[0]!.alerts[0]).toEqual({ level: "crit", text: "PHQ-9: respuesta de riesgo. Revisar a la brevedad." });
    expect(r.patients[1]!.alerts.map((a) => a.text)).toContain("El ánimo bajó de 7 a 3 (de 10) respecto de la quincena anterior.");
    expect(r.totals.withRisk).toBe(1);
  });

  it("avisa sin sesiones ni turno, y sin actividad en la app", () => {
    const r = buildBiweeklyReport(base());
    const ana = r.patients.find((p) => p.id === "a")!;
    expect(ana.alerts.map((a) => a.text)).toEqual(["Sin sesiones en la quincena ni turno agendado.", "Sin registros ni actividades en la app durante la quincena."]);
    expect(r.totals.withoutActivity).toBe(1);
  });
});
