"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { BookOpen, ClipboardCheck, Lock } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { CLINICAL_FOCI, assignableTest, bundleFor, focusByKey } from "@/lib/clinical/focus";
import { cn } from "@/lib/utils";
import { applyClinicalFocusAction } from "@/server/actions/clinical";

export type FocusMaterialInfo = { slug: string; title: string; published: boolean; assigned: boolean };

type Props = {
  patientId: string;
  current: { key: string; icd10: string | null; note: string | null }[];
  /** Materiales de todos los cuadros (para mostrar título y si ya está asignado). */
  materials: FocusMaterialInfo[];
  /** Tests pendientes o ya respondidos (no se vuelven a asignar desde acá si están pendientes). */
  pendingTests: string[];
};

/**
 * Diagnóstico probable y recursos que se habilitan. El paciente nunca ve el diagnóstico:
 * solo los materiales y tests que el profesional deja tildados al confirmar.
 */
export function ClinicalFocusPanel({ patientId, current, materials, pendingTests }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [keys, setKeys] = useState<string[]>(current.map((c) => c.key));
  const [icd, setIcd] = useState<Record<string, string>>(Object.fromEntries(current.map((c) => [c.key, c.icd10 ?? ""])));
  const [note, setNote] = useState(current.find((c) => c.note)?.note ?? "");
  const [unchecked, setUnchecked] = useState<Set<string>>(new Set());
  const [showResults, setShowResults] = useState(false);

  const info = useMemo(() => new Map(materials.map((m) => [m.slug, m])), [materials]);
  const bundle = bundleFor(keys);
  const toggleKey = (k: string) => setKeys((ks) => (ks.includes(k) ? ks.filter((x) => x !== k) : [...ks, k]));
  const toggleItem = (id: string) =>
    setUnchecked((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const materialItems = bundle.materials.map((slug) => ({ slug, m: info.get(slug) }));
  const selectableMaterials = materialItems.filter(({ m }) => m && m.published && !m.assigned);
  const selectedMaterials = selectableMaterials.filter(({ slug }) => !unchecked.has(`m:${slug}`)).map(({ slug }) => slug);
  const selectedTests = bundle.tests.filter((t) => !pendingTests.includes(t) && !unchecked.has(`t:${t}`));
  const changed = keys.length !== current.length || keys.some((k) => !current.some((c) => c.key === k)) || current.some((c) => (icd[c.key] ?? "") !== (c.icd10 ?? "")) || note !== (current.find((c) => c.note)?.note ?? "");

  const save = () =>
    startTransition(async () => {
      const result = await applyClinicalFocusAction({
        patientId,
        focus: keys.map((k) => ({ key: k, icd10: icd[k] || null, note: note || null })),
        materials: selectedMaterials,
        tests: selectedTests,
        showResults,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const { materials: m, tests: t } = result.data;
      toast.success(m + t > 0 ? `Listo: se habilitaron ${m} material${m === 1 ? "" : "es"} y ${t} test${t === 1 ? "" : "s"} para el paciente.` : "Diagnóstico guardado.");
      setUnchecked(new Set());
      router.refresh();
    });

  return (
    <div className="space-y-6">
      <p className="flex items-start gap-2 rounded-xl bg-surface-muted px-3 py-2 text-xs text-muted-foreground">
        <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden /> El paciente no ve el diagnóstico. Solo ve los materiales y tests que habilites abajo.
      </p>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Diagnóstico probable o foco clínico</legend>
        <div className="flex flex-wrap gap-2">
          {CLINICAL_FOCI.map((f) => {
            const on = keys.includes(f.key);
            return (
              <button
                key={f.key}
                type="button"
                aria-pressed={on}
                onClick={() => toggleKey(f.key)}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:border-primary/60",
                )}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      {keys.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {keys.map((k) => (
            <label key={k} className="grid gap-1.5 text-sm">
              <span className="font-medium">CIE-10 · {focusByKey(k)?.label}</span>
              <Input value={icd[k] ?? ""} onChange={(e) => setIcd((s) => ({ ...s, [k]: e.target.value }))} maxLength={20} placeholder={focusByKey(k)?.icd10 || "Código (opcional)"} />
            </label>
          ))}
          <label className="grid gap-1.5 text-sm sm:col-span-2">
            <span className="font-medium">Nota clínica breve (opcional, solo para vos)</span>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} className="min-h-20" />
          </label>
        </div>
      ) : null}

      {keys.length > 0 ? (
        <section className="space-y-3" aria-label="Recursos que se habilitan">
          <h3 className="text-sm font-medium">Recursos que se van a habilitar para el paciente</h3>
          {materialItems.length === 0 && bundle.tests.length === 0 ? <p className="text-sm text-muted-foreground">Este cuadro todavía no tiene recursos sugeridos. Podés asignar materiales a mano más abajo.</p> : null}
          <ul className="space-y-2">
            {materialItems.map(({ slug, m }) => {
              const id = `m:${slug}`;
              const disabled = !m || !m.published || m.assigned;
              return (
                <li key={id} className="flex items-start gap-3 rounded-xl border border-border/70 bg-card px-3 py-2.5">
                  <Checkbox id={id} checked={!disabled && !unchecked.has(id)} disabled={disabled} onCheckedChange={() => toggleItem(id)} className="mt-0.5" />
                  <label htmlFor={id} className="min-w-0 flex-1 text-sm">
                    <span className="flex items-center gap-1.5 font-medium">
                      <BookOpen className="size-3.5 text-muted-foreground" aria-hidden /> {m?.title ?? slug}
                    </span>
                    {m?.assigned ? <span className="text-xs text-success">Ya lo tiene habilitado</span> : null}
                    {!m ? <span className="text-xs text-warning">Falta cargar este material en la base (correr el SQL de actualización).</span> : null}
                    {m && !m.published ? <span className="text-xs text-muted-foreground">Sin publicar: publicalo en Materiales para poder asignarlo.</span> : null}
                  </label>
                </li>
              );
            })}
            {bundle.tests.map((t) => {
              const id = `t:${t}`;
              const def = assignableTest(t);
              const isPending = pendingTests.includes(t);
              return (
                <li key={id} className="flex items-start gap-3 rounded-xl border border-border/70 bg-card px-3 py-2.5">
                  <Checkbox id={id} checked={!isPending && !unchecked.has(id)} disabled={isPending} onCheckedChange={() => toggleItem(id)} className="mt-0.5" />
                  <label htmlFor={id} className="min-w-0 flex-1 text-sm">
                    <span className="flex items-center gap-1.5 font-medium">
                      <ClipboardCheck className="size-3.5 text-muted-foreground" aria-hidden /> Test {def?.name} <Badge variant="muted">{def?.full}</Badge>
                    </span>
                    {isPending ? <span className="text-xs text-muted-foreground">Ya está pendiente de responder</span> : null}
                  </label>
                </li>
              );
            })}
          </ul>
          {selectedTests.length > 0 ? (
            <label className="flex items-center gap-3 text-sm">
              <Switch checked={showResults} onCheckedChange={setShowResults} aria-label="Mostrar el resultado al paciente" />
              Mostrar el resultado de los tests al paciente <span className="text-xs text-muted-foreground">(apagado: solo lo ves vos)</span>
            </label>
          ) : null}
        </section>
      ) : null}

      <Button type="button" onClick={save} loading={pending} disabled={!changed && selectedMaterials.length + selectedTests.length === 0}>
        {selectedMaterials.length + selectedTests.length > 0 ? `Guardar y habilitar ${selectedMaterials.length + selectedTests.length} recurso${selectedMaterials.length + selectedTests.length === 1 ? "" : "s"}` : "Guardar diagnóstico"}
      </Button>
    </div>
  );
}
