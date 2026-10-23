// Genera las migraciones con los ejercicios y materiales a partir de los JSON (un archivo por
// ejercicio). Uso: pnpm db:contenido
//   supabase/content/ejercicios/*.json → cuadernillos (20261009000003)
//   supabase/content/cuadros/*.json    → recursos por cuadro clínico (20261024000002)
//   supabase/content/cuadros-2/*.json  → segunda tanda: técnicas de TCC, DBT y ACT (20261025000002)
// Los ejercicios se insertan solo si su slug no existe y los materiales solo si el
// ejercicio todavía no tiene uno: nada de lo que se edite desde el panel se pisa.
// Los materiales nacen "asignados": el paciente los ve solo cuando el profesional se los asigna.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const CONTENT_DIR = path.join(ROOT, "supabase", "content", "ejercicios");
export const CONTENT_SQL_PATH = path.join(ROOT, "supabase", "migrations", "20261009000003_cuadernillos.sql");
export const FOCUS_CONTENT_DIR = path.join(ROOT, "supabase", "content", "cuadros");
export const FOCUS_CONTENT_SQL_PATH = path.join(ROOT, "supabase", "migrations", "20261024000002_recursos_cuadros.sql");
export const FOCUS2_CONTENT_DIR = path.join(ROOT, "supabase", "content", "cuadros-2");
export const FOCUS2_CONTENT_SQL_PATH = path.join(ROOT, "supabase", "migrations", "20261025000002_recursos_cuadros_2.sql");

/** Conjuntos de contenido: cada uno genera su propia migración. */
export const CONTENT_SETS = [
  { dir: CONTENT_DIR, sqlPath: CONTENT_SQL_PATH, title: "Ejercicios y materiales de los cuadernillos del Lic. Matías Sánchez" },
  { dir: FOCUS_CONTENT_DIR, sqlPath: FOCUS_CONTENT_SQL_PATH, title: "Recursos por cuadro clínico (psicoeducación y prácticas; borradores para revisión del profesional)" },
  { dir: FOCUS2_CONTENT_DIR, sqlPath: FOCUS2_CONTENT_SQL_PATH, title: "Recursos por cuadro clínico, segunda tanda: técnicas de TCC, DBT y ACT (borradores para revisión del profesional)" },
];

/** Lee los ejercicios ordenados por colección y orden. */
export function loadContent(dir = CONTENT_DIR) {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((file) => ({ file, ...JSON.parse(readFileSync(path.join(dir, file), "utf8")) }))
    .sort((a, b) => a.sort_order - b.sort_order || a.slug.localeCompare(b.slug));
}

const text = (v) => (v === null || v === undefined ? "null" : `'${String(v).replaceAll("'", "''")}'`);
const int = (v) => (Number.isInteger(v) ? String(v) : "null");
const json = (v) => {
  const body = JSON.stringify(v, null, 1).replace(/\n\s*/g, " ");
  if (body.includes("$steps$")) throw new Error("El contenido no puede incluir $steps$");
  return `$steps$${body}$steps$::jsonb`;
};

/** Devuelve el SQL de la migración. */
export function buildContentSql(items = loadContent(), title = CONTENT_SETS[0].title) {
  const templates = items
    .map(
      (e) =>
        `  (${text(e.slug)}, ${text(e.title)}, ${text(e.description)}, ${text(e.kind)}, ${text(e.approach)}, ${text(e.audience)}, ${text(e.collection)}, ${int(e.estimated_minutes)}, ${int(e.sort_order)},\n   ${json(e.steps)})`,
    )
    .join(",\n");
  const materials = items
    .filter((e) => e.material)
    .map((e) => `  (${text(e.slug)}, ${text(e.material.title)}, ${text(e.material.description)}, ${text(e.material.category)})`)
    .join(",\n");
  const sources = [...new Set(items.map((e) => e.source?.split(",")[0]).filter(Boolean))];

  return `-- =============================================================================
-- ${title}
-- (${sources.join(" · ") || "sin contenido"}).
--
-- Archivo generado con \`pnpm db:contenido\` a partir de los JSON de supabase/content/.
-- No lo edites a mano: cambiá los JSON y volvé a generarlo.
-- Solo agrega lo que falta: no pisa ejercicios ni materiales editados desde el panel.
-- =============================================================================
${
  items.length === 0
    ? "\nselect 1; -- todavía no hay ejercicios cargados\n"
    : `
insert into public.exercise_templates (slug, title, description, kind, approach, audience, collection, estimated_minutes, sort_order, steps) values
${templates}
on conflict (slug) do nothing;
${
  materials
    ? `
-- Recursos de la biblioteca de Materiales (abren el ejercicio correspondiente).
insert into public.materials (title, description, type, category_id, exercise_template_id, duration_minutes, visibility, is_published)
select v.title, v.description, 'exercise', c.id, t.id, t.estimated_minutes, 'assigned', true
from (values
${materials}
) as v(slug, title, description, category)
join public.exercise_templates t on t.slug = v.slug
left join public.material_categories c on c.slug = v.category
where not exists (select 1 from public.materials m where m.exercise_template_id = t.id);
`
    : ""
}`
}`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  for (const set of CONTENT_SETS) {
    const items = loadContent(set.dir);
    writeFileSync(set.sqlPath, buildContentSql(items, set.title));
    console.log(`✔ ${path.relative(ROOT, set.sqlPath)} actualizado (${items.length} ejercicios)`);
  }
}
