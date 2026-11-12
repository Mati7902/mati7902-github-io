import { describe, expect, it } from "vitest";

import { deidentifiedIntake } from "@/lib/workbook/ai-input";

describe("cuadernillo con IA: datos que se envían", () => {
  it("quita nombre, teléfono, contacto, fecha de nacimiento y residencia; manda la edad", () => {
    const { age, lines } = deidentifiedIntake({
      nombre: "Ana Pérez",
      telefono: "0981 000 000",
      contacto_emergencia: { nombre: "Mamá", telefono: "0982 111 111" },
      fecha_nacimiento: "2000-01-01",
      residencia: "Encarnación",
      motivo: "Ansiedad antes de los exámenes",
      sueno: "No",
      objetivos: "Dormir mejor",
    });
    const text = lines.join("\n");
    expect(age).toBeGreaterThanOrEqual(25);
    expect(text).not.toMatch(/Ana|0981|0982|Mamá|2000-01-01|Encarnación/);
    expect(text).toMatch(/Motivo principal de consulta.*Ansiedad/);
    expect(text).toMatch(/Objetivos de terapia: Dormir mejor/);
    expect(text).not.toMatch(/Horas y calidad del sueño/);
  });
});
