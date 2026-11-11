import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TodayCard } from "@/components/progress/today-card";
import { summarize } from "@/lib/progress";
import type { TherapyGoal } from "@/types/domain";

const summary = summarize([{ at: "2026-11-09T12:00:00Z", type: "registro" }, { at: "2026-11-11T12:00:00Z", type: "tcc" }], { weeklyGoal: 3, tz: "America/Asuncion", now: new Date("2026-11-11T20:00:00Z") });
const goal = { id: "g1", title: "Dormir mejor", detail: null, status: "active" } as TherapyGoal;
const suggestion = { href: "/app/ejercicios/x", title: "Respiración guiada", minutes: 3 };

describe("TodayCard", () => {
  it("muestra la meta, el mensaje sin culpa, la práctica sugerida y los objetivos", () => {
    render(<TodayCard summary={summary} paused={false} goals={[goal]} suggestion={suggestion} />);
    expect(screen.getByRole("img", { name: "2 de 3 prácticas esta semana" })).toBeInTheDocument();
    expect(screen.getByText(/Cada práctica cuenta/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Empezar: Respiración guiada · 3 min/ })).toHaveAttribute("href", "/app/ejercicios/x");
    expect(screen.getByText("Dormir mejor")).toBeInTheDocument();
  });

  it("en pausa no muestra la meta", () => {
    render(<TodayCard summary={summary} paused goals={[]} suggestion={suggestion} />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText(/en pausa/)).toBeInTheDocument();
  });
});
