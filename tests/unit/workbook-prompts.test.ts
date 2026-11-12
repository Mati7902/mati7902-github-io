import { describe, expect, it } from "vitest";

import { formatWorkbookAnswer, normalizePrompt } from "@/lib/workbook/rules";

describe("consignas del cuadernillo", () => {
  it("las viejas sin tipo son preguntas abiertas", () => {
    expect(normalizePrompt({ key: "c1p1", text: "¿Qué sentiste?", lines: 4 })).toEqual({ key: "c1p1", type: "text", text: "¿Qué sentiste?", lines: 4 });
  });

  it("acota escalas y limpia opciones; la correcta tiene que ser una opción", () => {
    expect(normalizePrompt({ key: "a", type: "scale", text: "x", min: 5, max: 50 })).toMatchObject({ min: 1, max: 10 });
    expect(normalizePrompt({ key: "a", type: "choice", text: "x", options: [" A ", "", "B"], correct: "C" })).toMatchObject({ options: ["A", "B"], correct: undefined });
    expect(normalizePrompt({ key: "a", type: "vf", text: "x", correct: "v", feedback: "porque" })).toMatchObject({ correct: "v", feedback: "porque" });
  });

  it("muestra las respuestas al profesional de forma legible", () => {
    expect(formatWorkbookAnswer({ key: "a", type: "vf", text: "x", correct: "f" }, "v")).toBe("Verdadero (esperada: falso)");
    expect(formatWorkbookAnswer({ key: "a", type: "checklist", text: "x", options: ["A", "B"] }, '["A","B"]')).toBe("• A\n• B");
    expect(formatWorkbookAnswer({ key: "a", type: "scale", text: "x", min: 0, max: 10 }, "7")).toBe("7 de 10");
  });
});
