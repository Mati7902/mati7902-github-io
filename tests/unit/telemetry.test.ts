import { describe, expect, it } from "vitest";

import { p75, pathTemplate } from "@/lib/telemetry";

describe("telemetría técnica", () => {
  it("quita identificadores y parámetros de la ruta", () => {
    expect(pathTemplate("/app/tests/3f2a1b4c-1111-4222-8333-444455556666")).toBe("/app/tests/:id");
    expect(pathTemplate("/admin/pacientes/3f2a1b4c-1111-4222-8333-444455556666/ingreso?x=1")).toBe("/admin/pacientes/:id/ingreso");
    expect(pathTemplate("/restablecer?token=secreto")).toBe("/restablecer");
    expect(pathTemplate("/app/ejercicios/cuadro-panico-entender")).toBe("/app/ejercicios/cuadro-panico-entender");
    expect(pathTemplate("/")).toBe("/");
  });

  it("calcula el percentil 75", () => {
    expect(p75([])).toBeNull();
    expect(p75([100])).toBe(100);
    expect(p75([400, 100, 300, 200])).toBe(300);
  });
});
