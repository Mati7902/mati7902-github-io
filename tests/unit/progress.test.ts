import { describe, expect, it } from "vitest";

import { challengeProgress, countedEvents, exerciseActivityType, summarize, weekKey, weekMessage, type PracticeEvent } from "@/lib/progress";

const TZ = "America/Asuncion";
// Asunción es UTC-3: 12:00Z = 09:00 local.
const at = (day: string, hourUtc = 12) => `${day}T${String(hourUtc).padStart(2, "0")}:00:00Z`;

describe("Mi Progreso: topes contra la práctica excesiva", () => {
  it("cuenta como máximo 5 actividades por día", () => {
    const events: PracticeEvent[] = [
      { at: at("2026-11-09", 11), type: "registro" },
      { at: at("2026-11-09", 12), type: "tcc" },
      { at: at("2026-11-09", 13), type: "dbt" },
      { at: at("2026-11-09", 14), type: "act" },
      { at: at("2026-11-09", 15), type: "movimiento" },
      { at: at("2026-11-09", 16), type: "descanso" },
    ];
    expect(countedEvents(events, TZ)).toHaveLength(5);
  });

  it("los hábitos dan la insignia Equilibrio con 3 días de cada pilar en una semana", () => {
    const days = ["2026-11-09", "2026-11-10", "2026-11-11"];
    const events: PracticeEvent[] = days.flatMap((d) => [
      { at: at(d, 12), type: "movimiento" as const },
      { at: at(d, 13), type: "descanso" as const },
      { at: at(d, 14), type: "alimentacion" as const },
    ]);
    const s = summarize(events, { weeklyGoal: 3, tz: TZ, now: new Date(at("2026-11-12")) });
    expect(s.badges).toContain("equilibrio");
    expect(s.byType.movimiento).toBe(3);
    expect(s.points).toBe(45);
  });

  it("no cuenta dos veces el mismo tipo en menos de 4 horas", () => {
    const events: PracticeEvent[] = [
      { at: at("2026-11-09", 11), type: "registro" },
      { at: at("2026-11-09", 12), type: "registro" },
      { at: at("2026-11-09", 16), type: "registro" },
    ];
    expect(countedEvents(events, TZ).map((e) => e.at)).toEqual([at("2026-11-09", 11), at("2026-11-09", 16)]);
  });
});

describe("Mi Progreso: resumen semanal e insignias", () => {
  it("la semana va de lunes a domingo en la hora local", () => {
    expect(weekKey("2026-11-11T12:00:00Z", TZ)).toBe("2026-11-09");
    // Lunes 01:00 UTC todavía es domingo en Asunción.
    expect(weekKey("2026-11-09T01:00:00Z", TZ)).toBe("2026-11-02");
  });

  it("suma puntos por la práctica y marca los días de la semana", () => {
    const events: PracticeEvent[] = [
      { at: at("2026-11-09"), type: "registro" },
      { at: at("2026-11-11"), type: "tcc" },
    ];
    const s = summarize(events, { weeklyGoal: 3, tz: TZ, now: new Date(at("2026-11-11", 20)) });
    expect(s.points).toBe(15);
    expect(s.thisWeek).toBe(2);
    expect(s.daysThisWeek).toEqual([true, false, true, false, false, false, false]);
    expect(s.badges).toEqual(["primer-paso"]);
    expect(weekMessage(s)).toBe("Completaste 2 de tus 3 actividades de esta semana. Cada práctica cuenta.");
  });

  it("las semanas cumplidas no se pierden al dejar de practicar y volver da una insignia", () => {
    const events: PracticeEvent[] = [
      { at: at("2026-10-05"), type: "registro" },
      { at: at("2026-10-06"), type: "registro" },
      { at: at("2026-11-10"), type: "dbt" },
    ];
    const s = summarize(events, { weeklyGoal: 2, tz: TZ, now: new Date(at("2026-11-11")) });
    expect(s.weeksMet).toBe(1);
    expect(s.badges).toContain("una-semana");
    expect(s.badges).toContain("retomando");
    expect(s.returning).toBe(false);
  });

  it("después de una pausa larga el mensaje da la bienvenida, sin reproche", () => {
    const s = summarize([{ at: at("2026-10-01"), type: "registro" }], { weeklyGoal: 3, tz: TZ, now: new Date(at("2026-11-11")) });
    expect(s.returning).toBe(true);
    expect(weekMessage(s)).toMatch(/Qué bueno verte de nuevo/);
  });
});

describe("Mi Progreso: desafíos", () => {
  it("cuenta días distintos con la actividad pedida, dentro del plazo", () => {
    const events: PracticeEvent[] = [
      { at: at("2026-11-02"), type: "registro" },
      { at: at("2026-11-02", 18), type: "registro" },
      { at: at("2026-11-03"), type: "tcc" },
      { at: at("2026-11-04"), type: "registro" },
      { at: at("2026-11-12"), type: "registro" },
    ];
    const p = challengeProgress({ challenge: "observacion-emocional", days: 7, target: 5, starts_on: "2026-11-02" }, events, TZ, new Date(at("2026-11-05")));
    expect(p).toMatchObject({ done: 2, target: 5, endsOn: "2026-11-08", completed: false, ended: false });
  });

  it("clasifica las plantillas de ejercicio", () => {
    expect(exerciseActivityType("breathing", "regulacion")).toBe("respiracion");
    expect(exerciseActivityType("custom", "dbt")).toBe("dbt");
    expect(exerciseActivityType("thought_record", "general")).toBe("tcc");
    expect(exerciseActivityType("custom", "general")).toBe("ejercicio");
  });
});
