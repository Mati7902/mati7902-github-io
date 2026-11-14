import { describe, expect, it } from "vitest";

import { choiceOptions, customToTestDef } from "@/lib/guia/custom-tests";
import { itemOptions, scoreTest } from "@/lib/guia/scoring";

const row = {
  code: "pdemo123456",
  name: "Demo",
  full_name: "Inventario de ejemplo",
  instructions: "Elegí una opción por grupo.",
  kind: "choice",
  scale_min: null,
  scale_max: null,
  min_label: null,
  max_label: null,
  note: null,
  bands: [
    { upTo: 2, label: "Mínimo", level: "ok" },
    { upTo: 6, label: "Alto", level: "warn" },
  ],
  items: [
    { text: "Ánimo", choices: [{ score: 0, label: "Bien" }, { score: 1, label: "Algo bajo" }, { score: 2, label: "Muy bajo" }] },
    { text: "Sueño", choices: [{ score: 0, label: "Sin cambios" }, { score: 1, label: "Un poco más" }, { score: 1, label: "Un poco menos" }, { score: 3, label: "Casi no duermo" }] },
    { text: "Pensamientos de hacerse daño", alertFrom: 1, choices: [{ score: 0, label: "No" }, { score: 1, label: "A veces" }, { score: 3, label: "Sí" }] },
  ],
};

describe("Tests propios de opción múltiple", () => {
  it("distingue opciones con el mismo puntaje con una letra", () => {
    expect(choiceOptions([{ score: 0, label: "a" }, { score: 1, label: "b" }, { score: 1, label: "c" }]).map((o) => o.value)).toEqual(["0", "1a", "1b"]);
  });

  it("cada ítem tiene sus opciones y el puntaje máximo es la suma de los máximos", () => {
    const def = customToTestDef(row);
    expect(def.kind).toBe("sum");
    expect(def.max).toBe(8);
    expect(itemOptions(def, 1).map((o) => o.label)).toEqual(["Sin cambios", "Un poco más", "Un poco menos", "Casi no duermo"]);
  });

  it("suma los puntajes (1b vale 1) y marca alerta urgente en el ítem indicado", () => {
    const def = customToTestDef(row);
    const r = scoreTest(def, { 0: "1", 1: "1b", 2: "0" });
    expect(r.score).toBe(2);
    expect(r.band?.label).toBe("Mínimo");
    expect(r.flags).toEqual([]);
    const risky = scoreTest(def, { 0: "2", 1: "3", 2: "1" });
    expect(risky.score).toBe(6);
    expect(risky.flags[0]?.level).toBe("crit");
  });
});
