import { describe, expect, it } from "vitest";

import { divaText, divaVerdict, freshState, parseDivaContent, scoreDiva, toggleExample, type DivaContent, type DivaState } from "@/lib/diva";

// Contenido sintético (el real vive en la base del profesional).
const item = (id: string, domain: "A" | "H") => ({ id, domain, name: `Síntoma ${id}`, question: "¿…?", childQuestion: "¿…?", adult: ["ej adulto 1", "ej adulto 2"], child: ["ej niño 1"], note: null });
const content: DivaContent = {
  version: 1,
  source: "prueba",
  items: [...Array.from({ length: 9 }, (_, i) => item(`A${i + 1}`, "A")), ...Array.from({ length: 9 }, (_, i) => item(`H${i + 1}`, "H"))],
  areas: { adult: [{ name: "Trabajo", examples: ["x"] }, { name: "Pareja", examples: ["y"] }], child: [{ name: "Educación", examples: ["x"] }, { name: "Familia", examples: ["y"] }] },
  informants: ["Madre"],
};

const withAttention = (n: number, p: "a" | "c", st: DivaState) => {
  for (let i = 1; i <= n; i++) st.items[`A${i}`]![p] = toggleExample(st.items[`A${i}`]![p], 0, true);
  return st;
};

describe("DIVA-5", () => {
  it("marcar un ejemplo pone el síntoma en «Sí» automático y desmarcarlo lo vuelve atrás", () => {
    const s = toggleExample({ ex: [], otro: "", pres: null, auto: false }, 1, true);
    expect(s).toMatchObject({ pres: true, auto: true, ex: [1] });
    expect(toggleExample(s, 1, false)).toMatchObject({ pres: null, auto: false, ex: [] });
  });

  it("umbral adulto 5 desde los 17 años y 6 si es menor", () => {
    const st = withAttention(5, "a", freshState(content));
    expect(scoreDiva(content, st).Aa.n).toBe(5);
    expect(scoreDiva(content, st).thrAd).toBe(5);
    expect(scoreDiva(content, { ...st, age: "16" }).thrAd).toBe(6);
  });

  it("cumple criterios con presentación de déficit de atención cuando están B, C y E", () => {
    let st = withAttention(6, "c", withAttention(5, "a", freshState(content)));
    st = { ...st, B: "si", E: "no", areas: { a: [[0], [0]], c: [[0], [0]] } };
    const r = scoreDiva(content, st);
    const v = divaVerdict(r, st);
    expect(v.cls).toBe("ok");
    expect(v.presentation).toBe("con predominio del déficit de atención");
    expect(divaText(content, st, r, v)).toContain("CIE-10: F98.8");
  });

  it("sin inicio antes de los 12 años no cumple, y queda pendiente si falta el Criterio E", () => {
    const base = withAttention(6, "c", withAttention(6, "a", freshState(content)));
    const areas = { a: [[0], [0]], c: [[0], [0]] };
    expect(divaVerdict(scoreDiva(content, { ...base, areas, B: "no", E: "no" }), { ...base, B: "no", E: "no" }).cls).toBe("warn");
    expect(divaVerdict(scoreDiva(content, { ...base, areas, B: "si" }), { ...base, areas, B: "si" }).missing).toContain("Criterio E");
  });

  it("rechaza contenido mal formado", () => {
    expect(parseDivaContent({ items: [{ id: 1 }] })).toBeNull();
    expect(parseDivaContent(content)?.items).toHaveLength(18);
  });
});
