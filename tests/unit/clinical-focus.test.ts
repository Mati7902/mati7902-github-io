// @vitest-environment node
import { describe, expect, it } from "vitest";

// @ts-expect-error: módulo JavaScript de scripts/ sin tipos
import { CONTENT_SETS, loadContent } from "../../scripts/build-content-sql.mjs";
import { ASSIGNABLE_TESTS, CLINICAL_FOCI, assignableTest, bundleFor } from "@/lib/clinical/focus";
import { siteDefaults } from "@/lib/config/site";
import { TESTS } from "@/lib/guia/tests-data";

type Item = { slug: string; material?: unknown };
const items = (CONTENT_SETS as { dir: string }[]).flatMap((s) => loadContent(s.dir) as Item[]);
const withMaterial = new Set(items.filter((i) => i.material).map((i) => i.slug));

describe("cuadros clínicos y recursos", () => {
  it("hay un cuadro por cada área de atención de la portada, con claves únicas", () => {
    expect(CLINICAL_FOCI.map((f) => f.label)).toEqual(siteDefaults.specialties.map((s) => s.title));
    const keys = CLINICAL_FOCI.map((f) => f.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("cada material sugerido existe y tiene su recurso en la biblioteca", () => {
    for (const f of CLINICAL_FOCI) for (const m of f.materials) expect(withMaterial.has(m), `${f.key}: ${m}`).toBe(true);
  });

  it("todos los cuadros tienen al menos dos materiales y los tests sugeridos existen", () => {
    for (const f of CLINICAL_FOCI) {
      expect(f.materials.length, f.key).toBeGreaterThanOrEqual(2);
      for (const t of f.tests) expect(TESTS.some((x) => x.id === t), `${f.key}: ${t}`).toBe(true);
    }
  });

  it("ASQ, Plutchik, SAPAS y TIPI no se asignan para hacer en casa", () => {
    for (const id of ["asq", "plut", "sapas", "tipi"]) expect(assignableTest(id)).toBeUndefined();
    expect(ASSIGNABLE_TESTS.map((t) => t.id)).toContain("phq9");
  });

  it("une los recursos de varios cuadros sin repetir", () => {
    const b = bundleFor(["ansiedad", "burnout", "inexistente"]);
    expect(b.tests).toEqual(["gad7", "ais"]);
    expect(new Set(b.materials).size).toBe(b.materials.length);
    expect(b.materials).toContain("cuadro-burnout-practica");
    expect(bundleFor([])).toEqual({ materials: [], tests: [] });
  });
});
