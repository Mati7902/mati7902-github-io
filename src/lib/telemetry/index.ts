/** Telemetría técnica sin datos personales: funciones puras compartidas por cliente, API y panel. */
export const VITAL_KINDS = ["LCP", "INP", "CLS", "FCP", "TTFB"] as const;
export type TechKind = (typeof VITAL_KINDS)[number] | "error";

/** Umbrales "bueno" de Core Web Vitals (percentil 75). */
export const VITAL_TARGETS: Record<"LCP" | "INP" | "CLS", number> = { LCP: 2500, INP: 200, CLS: 0.1 };

/** Quita identificadores y parámetros de la ruta: /app/tests/3f2a… → /app/tests/:id */
export function pathTemplate(pathname: string): string {
  const clean = pathname.split(/[?#]/)[0] ?? "/";
  const parts = clean
    .split("/")
    .map((seg) => (/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(seg) || /^\d+$/.test(seg) || seg.length > 40 ? ":id" : seg));
  return parts.join("/").slice(0, 120) || "/";
}

/** Percentil 75 (el que usan los Core Web Vitals). null sin datos. */
export function p75(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.75) - 1)] ?? null;
}
