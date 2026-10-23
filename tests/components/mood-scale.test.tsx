import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { MoodScale } from "@/components/emotions/mood-scale";

function Controlled({ onChange }: { onChange: (v: number) => void }) {
  const [value, setValue] = useState<number | null>(null);
  return (
    <MoodScale
      value={value}
      onChange={(v) => {
        setValue(v);
        onChange(v);
      }}
    />
  );
}

describe("MoodScale", () => {
  it("muestra 10 insignias de +1 a +10 y marca la elegida", () => {
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(10);
    expect(radios[0]).toHaveTextContent("+1");
    expect(radios[9]).toHaveTextContent("+10");
    fireEvent.click(screen.getByRole("radio", { name: "7 de 10" }));
    expect(onChange).toHaveBeenLastCalledWith(7);
    expect(screen.getByRole("radio", { name: "7 de 10" })).toHaveAttribute("aria-checked", "true");
  });

  it("se maneja con las flechas del teclado sin salirse de la escala", () => {
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);
    const group = screen.getByRole("radiogroup");
    fireEvent.keyDown(group, { key: "ArrowRight" });
    expect(onChange).toHaveBeenLastCalledWith(1);
    fireEvent.keyDown(group, { key: "ArrowRight" });
    expect(onChange).toHaveBeenLastCalledWith(2);
    expect(screen.getByRole("radio", { name: "2 de 10" })).toHaveFocus();
    fireEvent.keyDown(group, { key: "ArrowLeft" });
    fireEvent.keyDown(group, { key: "ArrowLeft" });
    expect(onChange).toHaveBeenLastCalledWith(1);
  });
});
