"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { saveInstrumentAction } from "@/server/actions/instruments";
import type { Instrument } from "@/types/domain";

type Draft = {
  id?: string;
  name: string;
  short_name: string;
  edition: string;
  rights_holder: string;
  language: string;
  license_scope: string;
  digital_permission: boolean;
  remote_permission: boolean;
  license_expires_on: string;
  score_min: string;
  score_max: string;
  higher_is: "" | "worse" | "better";
  notes: string;
  is_active: boolean;
};

const empty: Draft = { name: "", short_name: "", edition: "", rights_holder: "", language: "Español", license_scope: "", digital_permission: false, remote_permission: false, license_expires_on: "", score_min: "", score_max: "", higher_is: "", notes: "", is_active: true };
const toDraft = (i: Instrument): Draft => ({
  id: i.id,
  name: i.name,
  short_name: i.short_name,
  edition: i.edition ?? "",
  rights_holder: i.rights_holder ?? "",
  language: i.language ?? "",
  license_scope: i.license_scope ?? "",
  digital_permission: i.digital_permission,
  remote_permission: i.remote_permission,
  license_expires_on: i.license_expires_on ?? "",
  score_min: i.score_min?.toString() ?? "",
  score_max: i.score_max?.toString() ?? "",
  higher_is: (i.higher_is as Draft["higher_is"]) ?? "",
  notes: i.notes ?? "",
  is_active: i.is_active,
});

/** Datos de la licencia de un instrumento. Sin ítems: la plataforma no reproduce material protegido. */
export function InstrumentForm({ instrument }: { instrument?: Instrument }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [d, setD] = useState<Draft>(instrument ? toDraft(instrument) : empty);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));
  const n = (v: string) => (v.trim() === "" ? null : Number(v));

  const save = () =>
    startTransition(async () => {
      const r = await saveInstrumentAction({ ...d, score_min: n(d.score_min), score_max: n(d.score_max), higher_is: d.higher_is || null });
      if (!r.ok) return void toast.error(r.fieldErrors ? (Object.values(r.fieldErrors)[0] ?? r.error) : r.error);
      toast.success("Instrumento guardado.");
      if (!instrument) setD(empty);
      router.refresh();
    });

  const field = (k: keyof Draft, label: string, props: React.ComponentProps<typeof Input> = {}) => (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      <Input value={d[k] as string} onChange={(e) => set(k, e.target.value as never)} {...props} />
    </label>
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
        {field("name", "Nombre completo", { maxLength: 120 })}
        {field("short_name", "Sigla", { maxLength: 30 })}
        {field("edition", "Edición y adaptación", { maxLength: 120, placeholder: "Ej.: adaptación argentina, 2006" })}
        {field("language", "Idioma", { maxLength: 60 })}
        {field("rights_holder", "Titular de derechos / distribuidor", { maxLength: 160 })}
        {field("license_expires_on", "Vencimiento de la licencia", { type: "date" })}
      </div>
      <label className="grid gap-1.5 text-sm">
        <span className="font-medium">Alcance de la licencia</span>
        <Textarea value={d.license_scope} onChange={(e) => set("license_scope", e.target.value)} maxLength={500} className="min-h-16" placeholder="Qué compraste y qué permite: cantidad de aplicaciones, papel o digital, administración remota, capacitación requerida…" />
      </label>
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <label className="flex items-center gap-2">
          <Switch checked={d.digital_permission} onCheckedChange={(v) => set("digital_permission", v)} aria-label="Permiso de reproducción digital" /> Permiso de reproducción digital
        </label>
        <label className="flex items-center gap-2">
          <Switch checked={d.remote_permission} onCheckedChange={(v) => set("remote_permission", v)} aria-label="Permiso de administración remota" /> Permiso de administración remota
        </label>
        <label className="flex items-center gap-2">
          <Switch checked={d.is_active} onCheckedChange={(v) => set("is_active", v)} aria-label="Activo" /> Activo
        </label>
      </div>
      {d.digital_permission ? <p className="rounded-xl bg-warning-soft px-3 py-2 text-xs">Aun con permiso digital, la plataforma no carga ítems de instrumentos protegidos: se registran los resultados. Si tu licencia lo permite y querés administrarlo en la app, se agrega como un desarrollo aparte con el texto oficial.</p> : null}
      <div className="grid gap-3 sm:grid-cols-3">
        {field("score_min", "Puntaje mínimo", { type: "number", step: "any" })}
        {field("score_max", "Puntaje máximo", { type: "number", step: "any" })}
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">Un puntaje más alto es</span>
          <select value={d.higher_is} onChange={(e) => set("higher_is", e.target.value as Draft["higher_is"])} className="h-11 rounded-xl border border-input bg-card px-3">
            <option value="">—</option>
            <option value="worse">Más síntomas</option>
            <option value="better">Mejor</option>
          </select>
        </label>
      </div>
      <label className="grid gap-1.5 text-sm">
        <span className="font-medium">Notas</span>
        <Textarea value={d.notes} onChange={(e) => set("notes", e.target.value)} maxLength={1000} className="min-h-16" />
      </label>
      <Button onClick={save} loading={pending}>
        {instrument ? "Guardar cambios" : "Agregar instrumento"}
      </Button>
    </div>
  );
}
