import { TESTS } from "@/lib/guia/tests-data";
import type { TestDef } from "@/lib/guia/types";

/**
 * Cuadros clínicos de atención (los mismos de la portada) y los recursos que se habilitan
 * al asignarlos como diagnóstico probable. Los materiales se identifican por el slug del
 * ejercicio que abren (materials.exercise_template_id); los tests, por el id de la guía.
 * El profesional puede destildar recursos antes de confirmar y asignar otros a mano.
 */
export type ClinicalFocus = {
  key: string;
  label: string;
  /** Códigos CIE-10 orientativos para completar el campo (el profesional decide). */
  icd10: string;
  materials: string[];
  tests: string[];
};

export const CLINICAL_FOCI: ClinicalFocus[] = [
  { key: "ansiedad", label: "Ansiedad y ataques de pánico", icd10: "F41.0 · F41.1", materials: ["cuadro-panico-entender", "cuadro-panico-practica", "tcc-modelo-cognitivo"], tests: ["gad7"] },
  { key: "depresion", label: "Depresión y estado de ánimo", icd10: "F32 · F33 · F34.1", materials: ["tcc-antes-de-empezar", "tcc-modelo-cognitivo", "tcc-activacion-conductual", "tcc-pensamientos-automaticos"], tests: ["phq9"] },
  { key: "toc", label: "Trastorno obsesivo-compulsivo (TOC)", icd10: "F42", materials: ["cuadro-toc-entender", "cuadro-toc-practica"], tests: ["ocir"] },
  { key: "trauma", label: "Trauma y estrés postraumático", icd10: "F43.1 · F43.2", materials: ["cuadro-trauma-entender", "cuadro-trauma-practica"], tests: ["pcl5"] },
  { key: "duelo", label: "Duelo", icd10: "Z63.4 · F43.2", materials: ["cuadro-duelo-entender", "cuadro-duelo-practica"], tests: ["phq9"] },
  { key: "burnout", label: "Estrés laboral y burnout", icd10: "Z73.0 · F43.2", materials: ["cuadro-burnout-entender", "cuadro-burnout-practica"], tests: ["gad7", "ais"] },
  { key: "sueno", label: "Insomnio y sueño", icd10: "F51.0 · G47.0", materials: ["cuadro-sueno-entender", "cuadro-sueno-practica"], tests: ["ais"] },
  { key: "fobias", label: "Fobias y ansiedad social", icd10: "F40.1 · F40.2", materials: ["cuadro-fobias-entender", "cuadro-fobias-practica"], tests: ["spin"] },
  { key: "tdah", label: "TDAH en adultos", icd10: "F90.0", materials: ["cuadro-tdah-entender", "cuadro-tdah-practica"], tests: [] },
  { key: "alimentacion", label: "Conducta alimentaria", icd10: "F50", materials: ["cuadro-alimentacion-entender", "cuadro-alimentacion-practica"], tests: ["scoff"] },
  { key: "autoestima", label: "Autoestima", icd10: "", materials: ["cuadro-autoestima-entender", "cuadro-autoestima-practica"], tests: ["rses"] },
  { key: "pareja", label: "Pareja y vínculos", icd10: "Z63.0", materials: ["cuadro-pareja-entender", "cuadro-pareja-practica"], tests: [] },
  { key: "adolescentes", label: "Adolescentes", icd10: "", materials: ["brujula-entender-lo-que-me-pasa", "brujula-emocion-sube-a-100", "brujula-red-de-apoyo", "brujula-plan-momentos-dificiles"], tests: ["phq9", "gad7"] },
  { key: "regulacion", label: "Regulación emocional", icd10: "F43.2 · F60.3", materials: ["cuadro-regulacion-entender", "cuadro-regulacion-practica"], tests: [] },
];

export const focusByKey = (key: string) => CLINICAL_FOCI.find((f) => f.key === key);

/**
 * Tests que se pueden asignar para completar en casa. ASQ y Plutchik quedan para sesión:
 * un positivo exige una evaluación de seguridad en el momento. El SAPAS es una entrevista y el
 * TIPI no da un puntaje único para seguir en el tiempo.
 */
const IN_SESSION_ONLY = new Set(["asq", "plut", "tipi", "sapas"]);
export const ASSIGNABLE_TESTS: TestDef[] = TESTS.filter((t) => !IN_SESSION_ONLY.has(t.id));
export const assignableTest = (id: string) => ASSIGNABLE_TESTS.find((t) => t.id === id);

/** Une los recursos de varios cuadros sin repetir, en el orden en que aparecen. */
export function bundleFor(keys: string[]): { materials: string[]; tests: string[] } {
  const materials: string[] = [];
  const tests: string[] = [];
  for (const key of keys) {
    const focus = focusByKey(key);
    if (!focus) continue;
    for (const m of focus.materials) if (!materials.includes(m)) materials.push(m);
    for (const t of focus.tests) if (assignableTest(t) && !tests.includes(t)) tests.push(t);
  }
  return { materials, tests };
}
