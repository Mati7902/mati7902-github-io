"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { TimeSlotPicker } from "@/components/appointments/time-slot-picker";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime, localInputToUtcIso, weeklyLocalInputs } from "@/lib/dates";
import { adminCreateAppointmentAction, getAdminAvailabilityAction } from "@/server/actions/admin-appointments";
import type { SerializedAvailabilityDay } from "@/server/actions/appointments";

export type PatientOption = { id: string; first_name: string; last_name: string; phone: string | null; modality: "presencial" | "virtual" | "mixta" };

type Props = {
  patients: PatientOption[];
  timezone: string;
  defaultDuration: number;
  defaultPatientId?: string;
  trigger?: React.ReactNode;
};

export function NewAppointmentDialog({ patients, timezone, defaultDuration, defaultPatientId, trigger }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [patientId, setPatientId] = useState(defaultPatientId ?? "");
  const [modality, setModality] = useState<"presencial" | "virtual">("presencial");
  const [duration, setDuration] = useState(defaultDuration);
  const [status, setStatus] = useState<"pending" | "confirmed">("pending");
  const [days, setDays] = useState<SerializedAvailabilityDay[] | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<{ start: string; end: string } | null>(null);
  const [manualStart, setManualStart] = useState("");
  const [videoLink, setVideoLink] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [notify, setNotify] = useState(true);
  // Plan mensual: 4 sesiones, una por semana, desde el horario elegido. Las fechas se pueden ajustar.
  const [plan, setPlan] = useState<"individual" | "mensual">("individual");
  const [edits, setEdits] = useState<{ base: string; values: string[] } | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return patients.slice(0, 50);
    return patients.filter((p) => `${p.first_name} ${p.last_name}`.toLowerCase().includes(q) || (p.phone ?? "").includes(q)).slice(0, 50);
  }, [patients, query]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    getAdminAvailabilityAction({ modality }).then((res) => {
      if (cancelled) return;
      if (res.ok) {
        setDays(res.data.days);
        setSelectedDate((current) => current ?? res.data.days[0]?.dateKey ?? null);
      } else toast.error(res.error);
    });
    return () => {
      cancelled = true;
    };
  }, [open, modality]);

  const baseStart = slot?.start ?? (manualStart ? localInputToUtcIso(manualStart, timezone) : null);
  const seriesInputs = plan === "mensual" && baseStart ? (edits?.base === baseStart ? edits.values : weeklyLocalInputs(baseStart, 4, timezone)) : null;

  const submitSeries = (inputs: string[]) =>
    startTransition(async () => {
      if (!patientId) return void toast.error("Elegí un paciente.");
      const failed: string[] = [];
      let created = 0;
      for (const [k, value] of inputs.entries()) {
        const start = localInputToUtcIso(value, timezone);
        if (!start) {
          failed.push(`sesión ${k + 1}: fecha inválida`);
          continue;
        }
        const res = await adminCreateAppointmentAction({
          patientId,
          start,
          durationMinutes: duration,
          modality,
          status,
          videoLink: videoLink || null,
          location: location || null,
          adminNotes: [`Plan mensual · sesión ${k + 1} de ${inputs.length}`, notes].filter(Boolean).join(" · "),
          // Un solo aviso por WhatsApp (el de la primera sesión), no cuatro seguidos.
          notify: notify && created === 0,
        });
        if (res.ok) created++;
        else failed.push(`${formatDateTime(start, timezone)}: ${res.error}`);
      }
      if (failed.length) toast.error(`Se agendaron ${created} de ${inputs.length}. No se pudo: ${failed.join(" · ")}`, { duration: 12000 });
      else toast.success(`Plan mensual agendado: ${created} sesiones.`);
      if (created) {
        setOpen(false);
        setSlot(null);
        setManualStart("");
        setEdits(null);
        router.refresh();
      }
    });

  const submit = () =>
    startTransition(async () => {
      const start = baseStart;
      if (!patientId) return void toast.error("Elegí un paciente.");
      if (!start) return void toast.error("Elegí un horario.");
      const res = await adminCreateAppointmentAction({ patientId, start, durationMinutes: duration, modality, status, videoLink: videoLink || null, location: location || null, adminNotes: notes || null, notify });
      if (!res.ok) return void toast.error(res.error);
      if (res.data.warning) toast.warning(res.data.warning);
      else toast.success("Turno creado.");
      setOpen(false);
      setSlot(null);
      setManualStart("");
      router.refresh();
    });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus aria-hidden /> Nuevo turno
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Nuevo turno</DialogTitle>
          <DialogDescription>Se valida que el horario no se solape con otro turno ni con un bloqueo.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <FormField id="np-patient" label="Paciente">
            <div className="space-y-2">
              <Input placeholder="Buscar por nombre o teléfono…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Buscar paciente" />
              <Select value={patientId} onValueChange={setPatientId}>
                <SelectTrigger id="np-patient"><SelectValue placeholder="Elegí un paciente" /></SelectTrigger>
                <SelectContent>
                  {filtered.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.first_name} {p.last_name}
                      {p.phone ? ` · ${p.phone}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </FormField>
          <FormField id="np-plan" label="Plan">
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="np-plan">
              {(
                [
                  ["individual", "Sesión individual"],
                  ["mensual", "Mensual · 4 sesiones (una por semana)"],
                ] as const
              ).map(([v, l]) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={plan === v}
                  onClick={() => setPlan(v)}
                  className={`min-h-11 rounded-xl border px-4 text-sm font-medium ${plan === v ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}
                >
                  {l}
                </button>
              ))}
            </div>
          </FormField>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <FormField id="np-modality" label="Modalidad">
              <Select value={modality} onValueChange={(v) => { setModality(v as "presencial" | "virtual"); setSlot(null); setDays(null); }}>
                <SelectTrigger id="np-modality"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="presencial">Presencial</SelectItem>
                  <SelectItem value="virtual">Videoconsulta</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField id="np-duration" label="Duración (min)">
              <Input id="np-duration" type="number" min={15} max={240} step={5} value={duration} onChange={(e) => setDuration(Number(e.target.value) || defaultDuration)} />
            </FormField>
            <FormField id="np-status" label="Estado inicial" className="col-span-2 sm:col-span-1">
              <Select value={status} onValueChange={(v) => setStatus(v as "pending" | "confirmed")}>
                <SelectTrigger id="np-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendiente de confirmación</SelectItem>
                  <SelectItem value="confirmed">Confirmado</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Horario disponible</p>
            {days === null ? <Skeleton className="h-28 w-full" /> : days.length > 0 ? (
              <TimeSlotPicker days={days} selectedDate={selectedDate} onSelectDate={(d) => { setSelectedDate(d); setSlot(null); }} selectedSlot={slot?.start ?? null} onSelectSlot={(s, e) => { setSlot({ start: s, end: e }); setManualStart(""); }} timezone={timezone} />
            ) : (
              <p className="text-sm text-muted-foreground">No hay horarios libres dentro de la disponibilidad configurada.</p>
            )}
          </div>
          <FormField id="np-manual" label="O fecha y hora manual" hint={`Hora de ${timezone}. Para turnos fuera del horario habitual.`}>
            <Input id="np-manual" type="datetime-local" value={manualStart} onChange={(e) => { setManualStart(e.target.value); setSlot(null); }} />
          </FormField>
          {plan === "mensual" ? (
            <div className="space-y-2 rounded-xl bg-surface-muted p-3">
              <p className="text-sm font-medium">Fechas del plan</p>
              {seriesInputs ? (
                <>
                  <ol className="grid gap-2">
                    {seriesInputs.map((v, k) => (
                      <li key={k} className="flex items-center gap-2 text-sm">
                        <span className="w-20 shrink-0 text-muted-foreground">Sesión {k + 1}</span>
                        <Input
                          type="datetime-local"
                          value={v}
                          aria-label={`Fecha de la sesión ${k + 1}`}
                          onChange={(e) => setEdits({ base: baseStart!, values: seriesInputs.map((x, i) => (i === k ? e.target.value : x)) })}
                        />
                      </li>
                    ))}
                  </ol>
                  <p className="text-xs text-muted-foreground">Misma hora, una vez por semana desde el horario elegido. Podés cambiar cualquier fecha antes de agendar.</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Elegí el horario de la primera sesión y se completan las otras tres.</p>
              )}
            </div>
          ) : null}
          {modality === "virtual" ? (
            <FormField id="np-video" label="Enlace de videollamada" optional>
              <Input id="np-video" type="url" value={videoLink} onChange={(e) => setVideoLink(e.target.value)} placeholder="https://meet.google.com/…" />
            </FormField>
          ) : (
            <FormField id="np-location" label="Lugar" optional>
              <Input id="np-location" value={location} onChange={(e) => setLocation(e.target.value)} maxLength={200} />
            </FormField>
          )}
          <FormField id="np-notes" label="Notas administrativas" optional>
            <Textarea id="np-notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} className="min-h-20" />
          </FormField>
          <div className="flex items-center gap-2">
            <Checkbox id="np-notify" checked={notify} onCheckedChange={(v) => setNotify(Boolean(v))} />
            <Label htmlFor="np-notify" className="font-normal">Avisar al paciente por WhatsApp</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>Cancelar</Button>
          {plan === "mensual" ? (
            <Button onClick={() => (seriesInputs ? submitSeries(seriesInputs) : toast.error("Elegí un horario."))} loading={pending}>
              Agendar las 4 sesiones
            </Button>
          ) : (
            <Button onClick={submit} loading={pending}>Crear turno</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
