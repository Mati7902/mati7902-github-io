import { describe, expect, it } from "vitest";

import { average, dailyMood, lastDays, trendLine, weekComparison } from "@/lib/mood";

const TZ = "America/Asuncion";

describe("ánimo diario", () => {
  it("promedia por día en la zona del consultorio e ignora registros sin ánimo", () => {
    const days = dailyMood(
      [
        { logged_at: "2026-10-20T12:00:00Z", mood: 4 },
        { logged_at: "2026-10-20T20:00:00Z", mood: 7 },
        // 01:30 UTC del 21 = 22:30 del 20 en Asunción (UTC-3)
        { logged_at: "2026-10-21T01:30:00Z", mood: 8 },
        { logged_at: "2026-10-21T15:00:00Z", mood: null },
        { logged_at: "2026-10-22T15:00:00Z", mood: 6 },
      ],
      TZ,
    );
    expect(days).toEqual([
      { day: "2026-10-20", mood: 6.3, count: 3 },
      { day: "2026-10-22", mood: 6, count: 1 },
    ]);
  });

  it("filtra los últimos N días contando hoy", () => {
    const days = [
      { day: "2026-10-10", mood: 5, count: 1 },
      { day: "2026-10-17", mood: 6, count: 1 },
      { day: "2026-10-23", mood: 7, count: 1 },
    ];
    expect(lastDays(days, 7, "2026-10-23").map((d) => d.day)).toEqual(["2026-10-17", "2026-10-23"]);
    expect(lastDays(days, 30, "2026-10-23")).toHaveLength(3);
  });

  it("compara esta semana con la anterior", () => {
    const days = [
      { day: "2026-10-12", mood: 4, count: 1 },
      { day: "2026-10-15", mood: 6, count: 1 },
      { day: "2026-10-18", mood: 7, count: 1 },
      { day: "2026-10-23", mood: 8, count: 1 },
    ];
    expect(weekComparison(days, "2026-10-23")).toEqual({ current: 7.5, previous: 5 });
    expect(weekComparison([], "2026-10-23")).toEqual({ current: null, previous: null });
    expect(average([])).toBeNull();
  });

  it("traza la tendencia con al menos 3 días y la mantiene dentro de la escala", () => {
    expect(trendLine([{ day: "2026-10-01", mood: 3, count: 1 }, { day: "2026-10-02", mood: 5, count: 1 }])).toBeNull();
    const up = trendLine([
      { day: "2026-10-01", mood: 2, count: 1 },
      { day: "2026-10-02", mood: 4, count: 1 },
      { day: "2026-10-04", mood: 8, count: 1 },
    ])!;
    expect(up[0]).toBeLessThan(up[2]!);
    expect(up.every((v) => v >= 1 && v <= 10)).toBe(true);
    const flat = trendLine([
      { day: "2026-10-01", mood: 5, count: 1 },
      { day: "2026-10-02", mood: 5, count: 1 },
      { day: "2026-10-03", mood: 5, count: 1 },
    ]);
    expect(flat).toEqual([5, 5, 5]);
  });
});
