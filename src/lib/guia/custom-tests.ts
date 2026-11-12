import type { TestDef } from "./types";

/** Test propio tal como se guarda (custom_tests). */
export type CustomTestRow = {
  code: string;
  name: string;
  full_name: string;
  instructions: string;
  kind: string;
  scale_min: number | null;
  scale_max: number | null;
  min_label: string | null;
  max_label: string | null;
  items: unknown;
  bands: unknown;
  note: string | null;
};

export type CustomItem = { text: string; /** V/F: qué respuesta suma 1. Escala: ítem invertido. */ scoresIf?: "v" | "f"; reverse?: boolean };
export type CustomBand = { upTo: number; label: string; level: "ok" | "warn" | "crit" };

const asItems = (raw: unknown): CustomItem[] => (Array.isArray(raw) ? raw.filter((i): i is CustomItem => typeof i?.text === "string") : []);
const asBands = (raw: unknown): CustomBand[] => (Array.isArray(raw) ? raw.filter((b): b is CustomBand => typeof b?.upTo === "number" && typeof b?.label === "string") : []);

/**
 * Convierte un test propio al formato de la guía, para usar el mismo formulario y el mismo
 * cálculo de puntaje que los tests de uso libre.
 * - Verdadero/falso: cada ítem suma 1 si la respuesta es la indicada (por defecto, «verdadero»).
 * - Escala: suma de los valores; los ítems invertidos se puntúan al revés.
 */
export function customToTestDef(row: CustomTestRow): TestDef {
  const items = asItems(row.items);
  const bands = asBands(row.bands).sort((a, b) => a.upTo - b.upTo);
  const base = { id: row.code, domain: "Propio", name: row.name, full: row.full_name, who: "según criterio del profesional", license: "Test propio del profesional", intro: row.instructions, note: row.note ?? undefined, bands: bands.length ? bands : undefined };
  if (row.kind === "vf") {
    return {
      ...base,
      kind: "yn",
      options: [
        { value: "si", label: "Verdadero" },
        { value: "no", label: "Falso" },
      ],
      items: items.map((i) => ({ text: i.text, key: i.scoresIf === "f" ? "no" : "si" })),
      max: items.length,
    };
  }
  const min = row.scale_min ?? 0;
  const max = row.scale_max ?? 4;
  const options = Array.from({ length: max - min + 1 }, (_, k) => {
    const v = min + k;
    const label = v === min && row.min_label ? `${v} · ${row.min_label}` : v === max && row.max_label ? `${v} · ${row.max_label}` : String(v);
    return { value: String(v), label };
  });
  return { ...base, kind: "sum", options, items: items.map((i) => ({ text: i.text, reverse: i.reverse || undefined })), min: min * items.length, max: max * items.length, reverseSum: min + max };
}

/** Código para un test nuevo: "p" + 11 caracteres. */
export function newCustomCode(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "p";
  const bytes = crypto.getRandomValues(new Uint8Array(11));
  for (const b of bytes) out += chars[b % chars.length];
  return out;
}
