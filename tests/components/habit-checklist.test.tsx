import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const toggle = vi.fn(async (_input: unknown) => ({ ok: true, data: undefined }));
vi.mock("@/server/actions/habits", () => ({ toggleHabitAction: (input: unknown) => toggle(input) }));

import { HabitChecklist } from "@/components/habits/habit-checklist";

const days = [
  { key: "2026-11-10", label: "Hace 3 días" },
  { key: "2026-11-11", label: "Anteayer" },
  { key: "2026-11-12", label: "Ayer" },
  { key: "2026-11-13", label: "Hoy" },
];

describe("HabitChecklist", () => {
  it("muestra el avance semanal y marca el hábito de hoy con un toque", async () => {
    render(
      <HabitChecklist
        habits={[{ id: "mov-caminar-10", title: "Caminar 10 a 15 minutos", detail: "A paso suave.", perWeek: 4 }]}
        done={["mov-caminar-10|2026-11-11", "mov-caminar-10|2026-11-12"]}
        days={days}
        weekDays={["2026-11-09", "2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13"]}
      />,
    );
    expect(screen.getByText(/Esta semana: 2 de 4 días/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: "Caminar 10 a 15 minutos: hecho hoy" }));
    expect(toggle).toHaveBeenCalledWith({ habitId: "mov-caminar-10", day: "2026-11-13", done: true });
  });
});
