import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { WorkbookDocument } from "@/components/workbook/workbook-document";
import { buildDraft } from "@/lib/workbook/rules";

const { content } = buildDraft({
  answers: { motivo: "Ansiedad", sueno: "Duermo mal", objetivos: "Dormir mejor.", autolesion: "Hace años" },
  firstName: "Ana",
  professionalName: "Lic. Prueba",
  templates: [
    { slug: "tcc-antes-de-empezar", title: "Antes de empezar", estimated_minutes: 5 },
    { slug: "cuadro-sueno-entender", title: "Entender el sueño", estimated_minutes: 10 },
  ],
});

describe("Cuadernillo en PDF", () => {
  it("sale del mismo contenido que la versión digital, con hojas de trabajo y sin datos sensibles", () => {
    const { container } = render(
      <WorkbookDocument
        content={content}
        firstName="Ana"
        dateLabel="miércoles 11 de noviembre"
        professional={{ name: "Lic. Prueba", title: "Psicólogo", license: "R.P. 0000" }}
        steps={{
          "cuadro-sueno-entender": [
            { id: "a", type: "info", title: "Qué pasa con el sueño", content: "El sueño **cambia** con el estrés." },
            { id: "b", type: "list", prompt: "Tres cosas que hacés antes de dormir", count: 3 },
            { id: "c", type: "scale", prompt: "¿Cuánto descansaste?", min: 0, max: 10 },
          ],
        }}
      />,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Ana" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Entender el sueño" })).toBeInTheDocument();
    expect(screen.getByText("Tres cosas que hacés antes de dormir")).toBeInTheDocument();
    expect(screen.getByText("Dormir mejor.")).toBeInTheDocument();
    expect(container.querySelectorAll(".wb-page").length).toBe(2 + content.items.length + 2);
    // Las alertas para el profesional nunca van al documento del paciente.
    expect(container.textContent).not.toMatch(/autolesi/i);
  });
});
