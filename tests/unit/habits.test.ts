import { describe, expect, it } from "vitest";

import { ALL_HABIT_IDS, PILLARS } from "@/lib/habits/data";
import { habitDays } from "@/lib/habits/days";

describe("hábitos", () => {
  it("cada pilar tiene artículo con referencias, dos niveles y una nota de seguridad", () => {
    expect(PILLARS.map((p) => p.key)).toEqual(["movimiento", "descanso", "alimentacion"]);
    for (const p of PILLARS) {
      expect(p.article.sections.length).toBeGreaterThanOrEqual(3);
      expect(p.article.references.every((r) => r.url.startsWith("https://"))).toBe(true);
      expect(p.routine).toHaveLength(2);
      expect(p.safety.length).toBeGreaterThan(20);
    }
  });

  it("los ids son únicos, cumplen el formato de la base y su prefijo indica el pilar", () => {
    expect(new Set(ALL_HABIT_IDS).size).toBe(ALL_HABIT_IDS.length);
    for (const id of ALL_HABIT_IDS) expect(id).toMatch(/^(mov|des|ali)-[a-z0-9-]{2,30}$/);
  });

  it("el texto no usa cursivas con un asterisco (el lector solo entiende **negrita**)", () => {
    const text = PILLARS.flatMap((p) => p.article.sections.map((s) => s.body)).join("\n");
    expect(text.replace(/\*\*[^*]+\*\*/g, "")).not.toMatch(/\*/);
  });

  it("calcula hoy, los 3 días anteriores y la semana desde el lunes", () => {
    const { days, weekDays, today } = habitDays("America/Asuncion", new Date("2026-11-13T15:00:00Z"));
    expect(today).toBe("2026-11-13");
    expect(days.map((d) => d.key)).toEqual(["2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13"]);
    expect(weekDays).toEqual(["2026-11-09", "2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13"]);
  });
});
