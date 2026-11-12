"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { CustomBand, CustomItem } from "@/lib/guia/custom-tests";
import { saveCustomTestAction } from "@/server/actions/custom-tests";

export type CustomTestDraft = {
  id?: string;
  name: string;
  full_name: string;
  instructions: string;
  kind: "vf" | "scale";
  scale_min: number;
  scale_max: number;
  min_label: string;
  max_label: string;
  items: CustomItem[];
  bands: CustomBand[];
  note: string;
  is_active: boolean;
  answered?: number;
};

export const EMPTY_CUSTOM_TEST: CustomTestDraft = { name: "", full_name: "", instructions: "", kind: "vf", scale_min: 0, scale_max: 4, min_label: "Nunca", max_label: "Siempre", items: [{ text: "" }], bands: [], note: "", is_active: true };

const selectClass = "h-11 rounded-xl border border-input bg-card px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30";
const LEVELS = { ok: "Sin alerta", warn: "Atención", crit: "Alerta (aviso urgente)" } as const;

/** Constructor de tests propios: verdadero/falso o escala, con rangos de interpretación opcionales. */
export function CustomTestEditor({ initial }: { initial: CustomTestDraft }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [d, setD] = useState<CustomTestDraft>(initial);
  const set = <K extends keyof CustomTestDraft>(k: K, v: CustomTestDraft[K]) => setD((x) => ({ ...x, [k]: v }));
  const maxScore = d.kind === "vf" ? d.items.length : d.scale_max * d.items.length;

  const save = () =>
    startTransition(async () => {
      const r = await saveCustomTestAction({
        ...d,
        items: d.items.filter((i) => i.text.trim()),
        scale_min: d.kind === "scale" ? d.scale_min : null,
        scale_max: d.kind === "scale" ? d.scale_max : null,
        note: d.note || null,
        min_label: d.min_label || null,
        max_label: d.max_label || null,
      });
      if (!r.ok) return void toast.error(r.fieldErrors ? (Object.values(r.fieldErrors)[0] ?? r.error) : r.error);
      toast.success("Test guardado. Ya lo podés asignar desde la ficha del paciente o desde Hoy.");
      if (!initial.id) setD(EMPTY_CUSTOM_TEST);
      router.refresh();
    });

  return (
    <div className="space-y-5">
      {initial.answered ? <p className="rounded-xl bg-warning-soft px-3 py-2 text-xs">Ya tiene {initial.answered} respuesta{initial.answered === 1 ? "" : "s"}. Si cambiás ítems o puntajes, los resultados viejos se leen con la versión anterior; para cambios grandes conviene crear un test nuevo.</p> : null}
      <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">Nombre corto</span>
          <Input value={d.name} onChange={(e) => set("name", e.target.value)} maxLength={40} placeholder="Ej.: Creencias de pareja" />
        </label>
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">Nombre completo (lo ve el paciente)</span>
          <Input value={d.full_name} onChange={(e) => set("full_name", e.target.value)} maxLength={160} />
        </label>
      </div>
      <label className="grid gap-1.5 text-sm">
        <span className="font-medium">Consigna</span>
        <Textarea value={d.instructions} onChange={(e) => set("instructions", e.target.value)} maxLength={600} className="min-h-16" placeholder="Ej.: Leé cada frase y marcá si es verdadera o falsa para vos en las últimas dos semanas." />
      </label>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Tipo de respuesta</legend>
        <div className="flex flex-wrap gap-2" role="radiogroup">
          {(["vf", "scale"] as const).map((k) => (
            <button key={k} type="button" role="radio" aria-checked={d.kind === k} onClick={() => set("kind", k)} className={`min-h-11 rounded-xl border px-4 text-sm font-medium ${d.kind === k ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>
              {k === "vf" ? "Verdadero / Falso" : "Escala"}
            </button>
          ))}
        </div>
        {d.kind === "scale" ? (
          <div className="flex flex-wrap items-end gap-3 text-sm">
            <label className="grid gap-1.5">
              <span>Desde</span>
              <select value={d.scale_min} onChange={(e) => set("scale_min", Number(e.target.value))} className={selectClass}>
                <option value={0}>0</option>
                <option value={1}>1</option>
              </select>
            </label>
            <label className="grid gap-1.5">
              <span>Hasta</span>
              <select value={d.scale_max} onChange={(e) => set("scale_max", Number(e.target.value))} className={selectClass}>
                {[2, 3, 4, 5, 6, 7, 10].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5">
              <span>Etiqueta del mínimo</span>
              <Input value={d.min_label} onChange={(e) => set("min_label", e.target.value)} maxLength={40} className="w-40" />
            </label>
            <label className="grid gap-1.5">
              <span>Etiqueta del máximo</span>
              <Input value={d.max_label} onChange={(e) => set("max_label", e.target.value)} maxLength={40} className="w-40" />
            </label>
          </div>
        ) : null}
      </fieldset>

      <section className="space-y-2">
        <h3 className="text-sm font-medium">Ítems ({d.items.length})</h3>
        <ol className="space-y-2">
          {d.items.map((item, i) => (
            <li key={i} className="flex flex-wrap items-center gap-2">
              <span className="w-6 text-right text-sm tabular-nums text-muted-foreground">{i + 1}.</span>
              <Input value={item.text} onChange={(e) => set("items", d.items.map((x, k) => (k === i ? { ...x, text: e.target.value } : x)))} maxLength={300} className="min-w-0 flex-1" aria-label={`Ítem ${i + 1}`} />
              {d.kind === "vf" ? (
                <select value={item.scoresIf ?? "v"} onChange={(e) => set("items", d.items.map((x, k) => (k === i ? { ...x, scoresIf: e.target.value as "v" | "f" } : x)))} className={`${selectClass} h-10 text-sm`} aria-label={`Qué respuesta suma en el ítem ${i + 1}`}>
                  <option value="v">Suma si es V</option>
                  <option value="f">Suma si es F</option>
                </select>
              ) : (
                <label className="flex items-center gap-1.5 text-xs">
                  <Switch checked={Boolean(item.reverse)} onCheckedChange={(v) => set("items", d.items.map((x, k) => (k === i ? { ...x, reverse: v } : x)))} aria-label={`Ítem ${i + 1} invertido`} /> Invertido
                </label>
              )}
              <Button size="icon-sm" variant="ghost" aria-label={`Quitar ítem ${i + 1}`} onClick={() => set("items", d.items.filter((_, k) => k !== i))} disabled={d.items.length === 1}>
                <Trash2 />
              </Button>
            </li>
          ))}
        </ol>
        <Button variant="outline" size="sm" onClick={() => set("items", [...d.items, { text: "" }])} disabled={d.items.length >= 60}>
          <Plus aria-hidden /> Agregar ítem
        </Button>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-medium">Interpretación (opcional) · puntaje máximo {maxScore}</h3>
        <p className="text-xs text-muted-foreground">Rangos de menor a mayor. Un rango «Alerta» avisa como urgente en tu bandeja.</p>
        <ul className="space-y-2">
          {d.bands.map((b, i) => (
            <li key={i} className="flex flex-wrap items-center gap-2 text-sm">
              hasta
              <Input type="number" min={0} value={b.upTo} onChange={(e) => set("bands", d.bands.map((x, k) => (k === i ? { ...x, upTo: Number(e.target.value) } : x)))} className="w-20" aria-label="Hasta" />
              <Input value={b.label} onChange={(e) => set("bands", d.bands.map((x, k) => (k === i ? { ...x, label: e.target.value } : x)))} maxLength={60} placeholder="Ej.: leve" className="min-w-0 flex-1" aria-label="Etiqueta" />
              <select value={b.level} onChange={(e) => set("bands", d.bands.map((x, k) => (k === i ? { ...x, level: e.target.value as CustomBand["level"] } : x)))} className={`${selectClass} h-10 text-sm`} aria-label="Nivel">
                {Object.entries(LEVELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
              <Button size="icon-sm" variant="ghost" aria-label="Quitar rango" onClick={() => set("bands", d.bands.filter((_, k) => k !== i))}>
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
        {d.bands.length < 6 ? (
          <Button variant="outline" size="sm" onClick={() => set("bands", [...d.bands, { upTo: maxScore, label: "", level: "ok" }])}>
            <Plus aria-hidden /> Agregar rango
          </Button>
        ) : null}
      </section>

      <label className="grid gap-1.5 text-sm">
        <span className="font-medium">Nota para vos (fuente, criterio)</span>
        <Textarea value={d.note} onChange={(e) => set("note", e.target.value)} maxLength={600} className="min-h-14" />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <Switch checked={d.is_active} onCheckedChange={(v) => set("is_active", v)} aria-label="Activo" /> Activo (se puede asignar)
      </label>
      <Button onClick={save} loading={pending}>
        {initial.id ? "Guardar cambios" : "Crear test"}
      </Button>
    </div>
  );
}
