import { describe, expect, it } from "vitest";

import { buildDraft, type TemplateInfo } from "@/lib/workbook/rules";

const slugs = [
  "tcc-antes-de-empezar",
  "cuadro-panico-entender",
  "respiracion-diafragmatica",
  "tcc-pensamientos-automaticos",
  "cuadro-autoestima-tcc-creencias",
  "cuadro-sueno-entender",
  "cuadro-sueno-practica",
  "tcc-activacion-conductual",
  "cuadro-depresion-act-valores",
  "brujula-punto-de-partida",
  "brujula-detector-de-pensamientos",
];
const templates: TemplateInfo[] = slugs.map((slug) => ({ slug, title: `T ${slug}`, estimated_minutes: 10 }));
const base = { firstName: "Ana", professionalName: "Lic. Prueba", templates };

describe("cuadernillo: motor de reglas", () => {
  it("ansiedad, preocupaciones y sueño sugieren psicoeducación, respiración, pensamientos y sueño", () => {
    const { content, sources } = buildDraft({
      ...base,
      answers: { motivo: "Ansiedad", ansiedad_irritabilidad: "Mucha, todos los días", pensamientos_negativos: "Que todo va a salir mal", sueno: "Duermo 4 horas", objetivos: "Dormir mejor. Preocuparme menos." },
    });
    expect(content.items.map((i) => i.slug)).toEqual(["tcc-antes-de-empezar", "cuadro-panico-entender", "respiracion-diafragmatica", "tcc-pensamientos-automaticos", "cuadro-autoestima-tcc-creencias", "cuadro-sueno-entender"]);
    expect(content.goals).toEqual(["Dormir mejor.", "Preocuparme menos."]);
    expect(sources.reasons["cuadro-sueno-entender"]?.[0]).toMatch(/Sueño — Horas y calidad del sueño/);
    expect(sources.flags.some((f) => f.includes("Quedaron afuera"))).toBe(true);
  });

  it("las respuestas negativas no disparan reglas", () => {
    const { content } = buildDraft({ ...base, answers: { motivo: "Consulta", sueno: "No", anhedonia: "nada" } });
    expect(content.items.map((i) => i.slug)).toEqual(["tcc-antes-de-empezar"]);
  });

  it("lo sensible queda como alerta para la sesión, nunca como actividad", () => {
    const { content, sources } = buildDraft({ ...base, answers: { motivo: "x", autolesion: "Hace dos años", alcohol: "Fines de semana" } });
    expect(sources.flags.join(" ")).toMatch(/autolesión/);
    expect(sources.flags.join(" ")).toMatch(/sustancias/);
    expect(JSON.stringify(content)).not.toMatch(/autolesi|alcohol/i);
  });

  it("con compromiso bajo propone pocas actividades y avisa si falta el motivo", () => {
    const { content, sources } = buildDraft({ ...base, answers: { compromiso: "Bajo", ansiedad_irritabilidad: "sí", sueno: "mal" } });
    expect(content.items).toHaveLength(3);
    expect(sources.flags.join(" ")).toMatch(/Compromiso declarado bajo/);
    expect(sources.flags.join(" ")).toMatch(/información insuficiente/);
  });

  it("para adolescentes usa el cuadernillo Brújula y no sugiere plantillas que no existen", () => {
    const { content, sources } = buildDraft({ ...base, age: 15, answers: { motivo: "x", pensamientos_negativos: "sí", evitacion: "sí" } });
    expect(content.items.map((i) => i.slug)).toEqual(["brujula-punto-de-partida", "brujula-detector-de-pensamientos", "cuadro-autoestima-tcc-creencias"]);
    expect(sources.missing).toContain("cuadro-fobias-entender");
  });

  it("incluye los recursos del diagnóstico probable", () => {
    const { content } = buildDraft({ ...base, focusKeys: ["sueno"], answers: { motivo: "x" } });
    expect(content.items.map((i) => i.slug)).toContain("cuadro-sueno-entender");
  });
});
