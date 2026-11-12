import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/actions/workbook-answers", () => ({ saveWorkbookAnswerAction: vi.fn(async () => ({ ok: true, data: undefined })) }));

import { WorkbookChapters } from "@/components/workbook/workbook-chapters";

describe("cuadernillo interactivo", () => {
  it("muestra V/F, escala, opciones y lista, y explica la respuesta de repaso", async () => {
    render(
      <WorkbookChapters
        workbookId="77777777-7777-4777-8777-777777777777"
        answers={{}}
        chapters={[
          {
            key: "c1",
            title: "Entender la ansiedad",
            body: "La ansiedad es una **alarma**.",
            prompts: [
              { key: "c1p1", type: "vf", text: "La ansiedad siempre es peligrosa", correct: "f", feedback: "Es incómoda, pero no peligrosa." },
              { key: "c1p2", type: "scale", text: "¿Cuánta ansiedad sentiste hoy?", min: 0, max: 10, minLabel: "Nada", maxLabel: "Muchísima" },
              { key: "c1p3", type: "checklist", text: "Señales en tu cuerpo", options: ["Taquicardia", "Tensión"] },
              { key: "c1p4", type: "list", text: "Tres situaciones", count: 3 },
            ],
          },
        ]}
      />,
    );
    expect(screen.getByRole("heading", { name: "Entender la ansiedad" })).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(2 + 11);
    expect(screen.getAllByRole("checkbox")).toHaveLength(2);
    expect(screen.getAllByRole("textbox")).toHaveLength(3);
    fireEvent.click(screen.getByRole("radio", { name: "Verdadero" }));
    expect(await screen.findByText(/La respuesta es falso\. Es incómoda, pero no peligrosa\./)).toBeInTheDocument();
  });
});
