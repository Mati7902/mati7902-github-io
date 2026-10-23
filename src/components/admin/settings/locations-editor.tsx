"use client";

import { ExternalLink, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { directionsUrl } from "@/lib/locations";
import { deletePracticeLocationAction, savePracticeLocationAction, uploadLocationPhotoAction } from "@/server/actions/admin-schedule";
import type { PracticeLocation } from "@/types/domain";

type Draft = {
  id?: string;
  name: string;
  address: string;
  city: string;
  maps_url: string;
  photo_url: string | null;
  notes: string;
  sort_order: number;
  is_active: boolean;
};

const toDraft = (l: PracticeLocation): Draft => ({
  id: l.id,
  name: l.name,
  address: l.address,
  city: l.city ?? "",
  maps_url: l.maps_url ?? "",
  photo_url: l.photo_url,
  notes: l.notes ?? "",
  sort_order: l.sort_order,
  is_active: l.is_active,
});

/** Sedes de atención presencial: lo que muestra la portada en "Dónde atiendo". */
export function LocationsEditor({ locations }: { locations: PracticeLocation[] }) {
  const [drafts, setDrafts] = useState<Draft[]>(locations.map(toDraft));
  const add = () => setDrafts((d) => [...d, { name: "", address: "", city: "", maps_url: "", photo_url: null, notes: "", sort_order: d.length + 1, is_active: true }]);

  return (
    <div className="space-y-4">
      {drafts.map((d, i) => (
        <LocationCard
          key={d.id ?? `new-${i}`}
          draft={d}
          onChange={(patch) => setDrafts((all) => all.map((x, idx) => (idx === i ? { ...x, ...patch } : x)))}
          onRemoved={() => setDrafts((all) => all.filter((_, idx) => idx !== i))}
        />
      ))}
      <Button variant="outline" onClick={add}>
        <Plus aria-hidden /> Agregar sede
      </Button>
    </div>
  );
}

function LocationCard({ draft, onChange, onRemoved }: { draft: Draft; onChange: (patch: Partial<Draft>) => void; onRemoved: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [uploading, startUpload] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const save = () =>
    startTransition(async () => {
      const res = await savePracticeLocationAction({ ...draft, city: draft.city || null, maps_url: draft.maps_url || null, notes: draft.notes || null });
      if (!res.ok) return void toast.error(res.fieldErrors ? (Object.values(res.fieldErrors)[0] ?? res.error) : res.error);
      onChange({ id: res.data.id });
      toast.success("Sede guardada.");
      router.refresh();
    });

  const remove = () =>
    startTransition(async () => {
      if (draft.id) {
        const res = await deletePracticeLocationAction(draft.id);
        if (!res.ok) return void toast.error(res.error);
      }
      onRemoved();
      toast.success("Sede eliminada. Sus franjas quedan sin sede.");
      router.refresh();
    });

  const upload = () => {
    const file = fileRef.current?.files?.[0];
    if (!draft.id) return void toast.error("Guardá la sede antes de subir la foto.");
    if (!file) return void toast.error("Elegí una imagen.");
    const fd = new FormData();
    fd.set("id", draft.id);
    fd.set("file", file);
    startUpload(async () => {
      const res = await uploadLocationPhotoAction(fd);
      if (!res.ok) return void toast.error(res.error);
      onChange({ photo_url: res.data.url });
      toast.success("Foto actualizada.");
      router.refresh();
    });
  };

  return (
    <div className="space-y-4 rounded-2xl border border-border/70 bg-card p-4 sm:p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">Nombre completo</span>
          <Input value={draft.name} onChange={(e) => onChange({ name: e.target.value })} maxLength={120} placeholder="Sanatorio…" />
        </label>
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">Ciudad</span>
          <Input value={draft.city} onChange={(e) => onChange({ city: e.target.value })} maxLength={120} placeholder="Encarnación, Itapúa" />
        </label>
        <label className="grid gap-1.5 text-sm sm:col-span-2">
          <span className="font-medium">Dirección</span>
          <Input value={draft.address} onChange={(e) => onChange({ address: e.target.value })} maxLength={200} />
        </label>
        <label className="grid gap-1.5 text-sm sm:col-span-2">
          <span className="font-medium">Enlace de Google Maps (opcional)</span>
          <Input value={draft.maps_url} onChange={(e) => onChange({ maps_url: e.target.value })} maxLength={500} placeholder="https://maps.app.goo.gl/…" inputMode="url" />
          <span className="text-xs text-muted-foreground">Si lo dejás vacío, el botón «Cómo llegar» busca el nombre y la dirección en Google Maps.</span>
        </label>
        <label className="grid gap-1.5 text-sm sm:col-span-2">
          <span className="font-medium">Indicaciones (opcional)</span>
          <Input value={draft.notes} onChange={(e) => onChange({ notes: e.target.value })} maxLength={300} placeholder="Consultorio en planta baja, preguntá en recepción" />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        {draft.photo_url ? (
          <div className="relative h-20 w-32 overflow-hidden rounded-xl border border-border/70 bg-surface-muted">
            <Image src={draft.photo_url} alt={`Foto de ${draft.name}`} fill sizes="128px" className="object-cover" />
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Sin foto: la portada muestra el mapa. Subí una foto propia del lugar (no copies fotos de internet sin permiso).</p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="max-w-xs" aria-label="Elegir foto de la sede" />
          <Button type="button" variant="outline" size="sm" onClick={upload} loading={uploading} disabled={!draft.id}>
            Subir foto
          </Button>
          {draft.photo_url ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange({ photo_url: null })}>
              Quitar foto
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-divider pt-3">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <label className="flex items-center gap-2">
            <Switch checked={draft.is_active} onCheckedChange={(v) => onChange({ is_active: v })} aria-label="Mostrar en la portada" /> Mostrar en la portada
          </label>
          <label className="flex items-center gap-2">
            Orden <Input type="number" min={0} max={99} value={draft.sort_order} onChange={(e) => onChange({ sort_order: Number(e.target.value) })} className="h-9 w-16" aria-label="Orden" />
          </label>
          {draft.name && draft.address ? (
            <a href={directionsUrl({ ...draft, maps_url: draft.maps_url || null })} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline">
              Probar el mapa <ExternalLink className="size-3.5" aria-hidden />
            </a>
          ) : null}
        </div>
        <div className="flex gap-1">
          <Button size="sm" onClick={save} loading={pending}>
            Guardar
          </Button>
          <Button size="icon-sm" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={remove} disabled={pending} aria-label="Eliminar sede">
            <Trash2 />
          </Button>
        </div>
      </div>
    </div>
  );
}
