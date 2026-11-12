import { describe, expect, it } from "vitest";

import { customToTestDef } from "@/lib/guia/custom-tests";
import { scoreTest } from "@/lib/guia/scoring";

const base = { code: "pabc123def", name: "Mi test", full_name: "Cuestionario de prueba", instructions: "Respondé", min_label: null, max_label: null, note: null };

describe("tests propios", () => {
  it("verdadero/falso suma 1 por cada respuesta indicada", () => {
    const def = customToTestDef({ ...base, kind: "vf", scale_min: null, scale_max: null, items: [{ text: "A" }, { text: "B", scoresIf: "f" }, { text: "C" }], bands: [{ upTo: 1, label: "bajo", level: "ok" }, { upTo: 3, label: "alto", level: "warn" }] });
    expect(def.options.map((o) => o.label)).toEqual(["Verdadero", "Falso"]);
    const r = scoreTest(def, { 0: "si", 1: "no", 2: "no" });
    expect(r).toMatchObject({ score: 2, band: { label: "alto" } });
  });

  it("escala suma valores e invierte los ítems marcados", () => {
    const def = customToTestDef({ ...base, kind: "scale", scale_min: 0, scale_max: 4, min_label: "Nunca", max_label: "Siempre", items: [{ text: "A" }, { text: "B", reverse: true }], bands: [] });
    expect(def.options[0]?.label).toBe("0 · Nunca");
    expect(def.options.at(-1)?.label).toBe("4 · Siempre");
    expect(scoreTest(def, { 0: "3", 1: "1" }).score).toBe(6);
    expect(def.max).toBe(8);
  });
});
