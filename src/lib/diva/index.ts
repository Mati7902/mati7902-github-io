/**
 * DIVA-5: lógica de puntaje y texto para el HIS. Puro (sin datos del instrumento): el contenido
 * (preguntas y ejemplos) vive en la base del profesional, no en el código.
 * Umbrales DSM-5: infancia ≥ 6 de 9 por dominio; edad adulta ≥ 5 de 9 desde los 17 años (≥ 6 si es menor).
 */
export type DivaItem = { id: string; domain: "A" | "H"; name: string; question: string; childQuestion: string; adult: string[]; child: string[]; note: string | null };
export type DivaArea = { name: string; examples: string[] };
export type DivaContent = { version: number; source: string; items: DivaItem[]; areas: { adult: DivaArea[]; child: DivaArea[] }; informants: string[] };

export type Period = "a" | "c";
export type PeriodState = { ex: number[]; otro: string; pres: boolean | null; auto: boolean };
export type Tri = "si" | "no" | "na" | null;
export type DivaState = {
  age: string;
  negar: boolean;
  infs: string[];
  items: Record<string, { a: PeriodState; c: PeriodState }>;
  areas: { a: number[][]; c: number[][] };
  areaOtro: { a: string[]; c: string[] };
  B: "si" | "no" | null;
  onset: string;
  col: { aA: Tri; aH: Tri; cA: Tri; cH: Tri };
  E: "si" | "no" | "pend" | null;
  Etext: string;
};

const emptyPeriod = (): PeriodState => ({ ex: [], otro: "", pres: null, auto: false });

export function freshState(c: DivaContent): DivaState {
  return {
    age: "",
    negar: true,
    infs: [],
    items: Object.fromEntries(c.items.map((i) => [i.id, { a: emptyPeriod(), c: emptyPeriod() }])),
    areas: { a: c.areas.adult.map(() => []), c: c.areas.child.map(() => []) },
    areaOtro: { a: c.areas.adult.map(() => ""), c: c.areas.child.map(() => "") },
    B: null,
    onset: "",
    col: { aA: null, aH: null, cA: null, cH: null },
    E: null,
    Etext: "",
  };
}

/** Marcar o desmarcar un ejemplo: si hay ejemplos, el síntoma pasa a «Sí» automático. */
export function toggleExample(s: PeriodState, index: number, on: boolean): PeriodState {
  const ex = on ? [...new Set([...s.ex, index])].sort((a, b) => a - b) : s.ex.filter((i) => i !== index);
  if (ex.length && s.pres === null) return { ...s, ex, pres: true, auto: true };
  if (!ex.length && !s.otro.trim() && s.auto) return { ...s, ex, pres: null, auto: false };
  return { ...s, ex };
}

export const presOf = (st: DivaState, id: string, p: Period): boolean | null => {
  const s = st.items[id]?.[p];
  if (!s) return null;
  if (s.pres !== null) return s.pres;
  return st.negar ? false : null;
};

const label = (id: string) => id.replace("H", "H/I ");

export type DivaScore = {
  thrAd: number;
  Aa: { n: number; ids: string[]; pend: number };
  Ac: { n: number; ids: string[]; pend: number };
  Ha: { n: number; ids: string[]; pend: number };
  Hc: { n: number; ids: string[]; pend: number };
  Ca: { name: string; n: number }[];
  Cc: { name: string; n: number }[];
};

export function scoreDiva(c: DivaContent, st: DivaState): DivaScore {
  const age = Number.parseInt(st.age, 10);
  const thrAd = !Number.isNaN(age) && age < 17 ? 6 : 5;
  const dom = (d: "A" | "H", p: Period) => {
    const its = c.items.filter((i) => i.domain === d);
    const pos = its.filter((i) => presOf(st, i.id, p) === true).map((i) => label(i.id));
    return { n: pos.length, ids: pos, pend: its.filter((i) => presOf(st, i.id, p) === null).length };
  };
  const ar = (p: Period) =>
    (p === "a" ? c.areas.adult : c.areas.child)
      .map((a, k) => ({ name: a.name, n: (st.areas[p][k]?.length ?? 0) + (st.areaOtro[p][k]?.trim() ? 1 : 0) }))
      .filter((x) => x.n > 0);
  return { thrAd, Aa: dom("A", "a"), Ac: dom("A", "c"), Ha: dom("H", "a"), Hc: dom("H", "c"), Ca: ar("a"), Cc: ar("c") };
}

export type DivaVerdict = { cls: "ok" | "warn" | "neu"; title: string; fail: string[]; missing: string[]; presentation: string; code: string };

export function divaVerdict(r: DivaScore, st: DivaState): DivaVerdict {
  const pend = r.Aa.pend + r.Ac.pend + r.Ha.pend + r.Hc.pend;
  const adA = r.Aa.n >= r.thrAd;
  const adH = r.Ha.n >= r.thrAd;
  const chA = r.Ac.n >= 6;
  const chH = r.Hc.n >= 6;
  const fail: string[] = [];
  if (!(adA || adH)) fail.push(`no se alcanza el umbral de síntomas en la edad adulta (≥ ${r.thrAd} en algún dominio)`);
  if (!(chA || chH)) fail.push("no se alcanza el umbral de síntomas en la infancia (≥ 6 en algún dominio)");
  if (st.B === "no") fail.push("no hay inicio antes de los 12 años (Criterio B)");
  if (r.Ca.length < 2) fail.push("no hay disfunción en al menos dos áreas en la edad adulta (Criterio C)");
  if (r.Cc.length < 2) fail.push("no hay disfunción en al menos dos áreas en la infancia (Criterio C)");
  if (st.E === "si") fail.push("los síntomas se explican mejor por otro trastorno (Criterio E)");
  const missing: string[] = [];
  if (pend) missing.push(`${pend} ítem(s) sin valorar`);
  if (st.B === null) missing.push("Criterio B");
  if (st.E === null || st.E === "pend") missing.push("Criterio E");
  let presentation = "";
  let code = "";
  if (adA && adH) [presentation, code] = ["combinada", "F90.0"];
  else if (adA) [presentation, code] = ["con predominio del déficit de atención", "F98.8"];
  else if (adH) [presentation, code] = ["con predominio hiperactivo-impulsivo", "F90.0"];
  if (fail.length) return { cls: "warn", title: "No cumple criterios DIVA-5 para TDAH", fail, missing, presentation: "", code: "" };
  if (missing.length) return { cls: "neu", title: "Evaluación incompleta", fail, missing, presentation, code };
  return { cls: "ok", title: `Cumple criterios DIVA-5 para TDAH, presentación ${presentation}`, fail, missing, presentation, code };
}

const lst = (a: string[]) => (a.length ? a.join(", ") : "ninguno");

export function divaText(c: DivaContent, st: DivaState, r: DivaScore, v: DivaVerdict): string {
  const L: string[] = [];
  L.push("EVALUACIÓN DIVA-5 — Entrevista Diagnóstica para el TDAH en Adultos");
  L.push(`Fuentes: paciente${st.infs.length ? "; informantes: " + st.infs.join(", ").toLowerCase() : ""}.`);
  L.push("");
  L.push("DATOS");
  L.push(`- Déficit de atención (A1–A9): edad adulta ${r.Aa.n}/9 (${lst(r.Aa.ids)}); infancia ${r.Ac.n}/9 (${lst(r.Ac.ids)}).`);
  L.push(`- Hiperactividad-impulsividad (H/I 1–9): edad adulta ${r.Ha.n}/9 (${lst(r.Ha.ids)}); infancia ${r.Hc.n}/9 (${lst(r.Hc.ids)}).`);
  const ex: string[] = [];
  for (const it of c.items) {
    for (const p of ["a", "c"] as const) {
      const s = st.items[it.id]?.[p];
      if (!s || presOf(st, it.id, p) !== true) continue;
      const list = p === "a" ? it.adult : it.child;
      const e = s.ex.map((i) => (list[i] ?? "").replace(/\*$/, "")).filter(Boolean);
      if (s.otro.trim()) e.push(s.otro.trim());
      if (e.length) ex.push(`  ${label(it.id)} (${p === "a" ? "adulto" : "infancia"}): ${e.join("; ")}.`);
    }
  }
  if (ex.length) {
    L.push("- Ejemplos reconocidos:");
    L.push(...ex);
  }
  L.push(`- Criterio B (inicio antes de los 12 años): ${st.B === "si" ? "sí" : st.B === "no" ? "no" + (st.onset ? `; inicio referido a los ${st.onset} años` : "") : "sin valorar"}.`);
  const ca = r.Ca.map((x) => x.name.toLowerCase());
  const cc = r.Cc.map((x) => x.name.toLowerCase());
  L.push(`- Criterio C, disfunción en la edad adulta: ${r.Ca.length} área(s)${ca.length ? " (" + ca.join("; ") + ")" : ""}.`);
  L.push(`- Criterio C, disfunción en la infancia: ${r.Cc.length} área(s)${cc.length ? " (" + cc.join("; ") + ")" : ""}.`);
  const cv = (x: Tri) => (x === "si" ? "confirma" : x === "no" ? "no confirma" : x === "na" ? "no aplica" : "sin dato");
  if (Object.values(st.col).some(Boolean)) L.push(`- Información colateral: adulto A ${cv(st.col.aA)}, H/I ${cv(st.col.aH)}; infancia A ${cv(st.col.cA)}, H/I ${cv(st.col.cH)}.`);
  if (st.E) {
    const e = st.E === "no" ? "los síntomas no se explican mejor por otro trastorno" : st.E === "si" ? "los síntomas se explican mejor por otro trastorno" : "pendiente de valorar";
    L.push(`- Criterio E: ${e}${st.Etext.trim() ? " — " + st.Etext.trim() : ""}.`);
  }
  if (st.negar) L.push("- Los ejemplos no marcados fueron explorados y negados.");
  L.push("");
  L.push("INFERENCIA CLÍNICA");
  L.push(`- Edad adulta: ${r.Aa.n >= r.thrAd ? "alcanza" : "no alcanza"} el umbral en déficit de atención y ${r.Ha.n >= r.thrAd ? "alcanza" : "no alcanza"} el umbral en hiperactividad-impulsividad (≥ ${r.thrAd}/9).`);
  L.push(`- Infancia: ${r.Ac.n >= 6 ? "alcanza" : "no alcanza"} el umbral en déficit de atención y ${r.Hc.n >= 6 ? "alcanza" : "no alcanza"} el umbral en hiperactividad-impulsividad (≥ 6/9).`);
  if (v.fail.length) L.push("- Criterios no cumplidos: " + v.fail.join("; ") + ".");
  if (v.missing.length) L.push("- Pendiente: " + v.missing.join("; ") + ".");
  L.push("");
  L.push("IMPRESIÓN DIAGNÓSTICA");
  if (v.cls === "ok") L.push(`Resultados compatibles con TDAH, presentación ${v.presentation}. CIE-10: ${v.code} (verificar en el catálogo del HIS).`);
  else if (v.cls === "warn") {
    L.push("Los resultados de la DIVA-5 no apoyan el diagnóstico de TDAH.");
    if (r.Aa.n >= r.thrAd || r.Ha.n >= r.thrAd) L.push("Se registra sintomatología actual significativa que requiere diagnóstico diferencial.");
  } else L.push(`Evaluación DIVA-5 en curso${v.presentation ? `; hasta ahora, perfil compatible con presentación ${v.presentation}` : ""}. Completar: ${v.missing.join("; ")}.`);
  return L.join("\n");
}

/** Valida lo mínimo del contenido cargado en la base, para no romper la consola con datos mal formados. */
export function parseDivaContent(raw: unknown): DivaContent | null {
  const c = raw as Partial<DivaContent> | null;
  if (!c || !Array.isArray(c.items) || !c.areas || !Array.isArray(c.areas.adult) || !Array.isArray(c.areas.child)) return null;
  const okItem = (i: Partial<DivaItem>) =>
    typeof i.id === "string" && (i.domain === "A" || i.domain === "H") && typeof i.name === "string" && Array.isArray(i.adult) && Array.isArray(i.child);
  if (!c.items.every(okItem)) return null;
  return { version: c.version ?? 1, source: c.source ?? "", items: c.items as DivaItem[], areas: c.areas as DivaContent["areas"], informants: Array.isArray(c.informants) ? c.informants : [] };
}
