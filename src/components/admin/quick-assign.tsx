"use client";

import { Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { assignExerciseAction } from "@/server/actions/admin-patients";
import { assignTestAction } from "@/server/actions/clinical";

type Option = { id: string; label: string; group: string };
const selectClass = "h-11 w-full rounded-xl border border-input bg-card px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30";

/** Asignación rápida: paciente → ejercicio o test → indicación → fecha → enviar. */
export function QuickAssign({ patients, exercises, tests }: { patients: { id: string; name: string }[]; exercises: Option[]; tests: Option[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [patientId, setPatientId] = useState("");
  const [what, setWhat] = useState("");
  const [note, setNote] = useState("");
  const [due, setDue] = useState("");

  const send = () =>
    startTransition(async () => {
      const [kind, id] = what.split(":") as ["e" | "t", string];
      let r;
      if (kind === "t") r = await assignTestAction({ patientId, testId: id, showResult: false, dueOn: due, note: note || null });
      else {
        const fd = new FormData();
        fd.set("patient_id", patientId);
        fd.set("template_id", id);
        fd.set("note", note);
        fd.set("due_at", due);
        r = await assignExerciseAction(null, fd);
      }
      if (!r.ok) return void toast.error(r.fieldErrors ? (Object.values(r.fieldErrors)[0] ?? r.error) : r.error);
      toast.success("Enviado. El paciente lo ve en su cuenta.");
      setWhat("");
      setNote("");
      setDue("");
      router.refresh();
    });

  const groups = (list: Option[], prefix: string) =>
    [...new Set(list.map((o) => o.group))].map((g) => (
      <optgroup key={`${prefix}${g}`} label={g}>
        {list
          .filter((o) => o.group === g)
          .map((o) => (
            <option key={o.id} value={`${prefix}:${o.id}`}>{o.label}</option>
          ))}
      </optgroup>
    ));

  return (
    <div className="surface-card space-y-3 p-5">
      <div className="grid gap-2 sm:grid-cols-2">
        <select value={patientId} onChange={(e) => setPatientId(e.target.value)} className={selectClass} aria-label="Paciente">
          <option value="">Paciente…</option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <select value={what} onChange={(e) => setWhat(e.target.value)} className={selectClass} aria-label="Ejercicio o test">
          <option value="">Ejercicio o test…</option>
          {groups(tests, "t")}
          {groups(exercises, "e")}
        </select>
      </div>
      <div className="grid gap-2 sm:grid-cols-[1fr_11rem]">
        <Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="Indicación (opcional)" aria-label="Indicación" />
        <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} aria-label="Para cuándo (opcional)" />
      </div>
      <Button onClick={send} loading={pending} disabled={!patientId || !what}>
        <Send aria-hidden /> Enviar
      </Button>
    </div>
  );
}
