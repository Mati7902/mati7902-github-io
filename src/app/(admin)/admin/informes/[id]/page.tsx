import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, Info, ShieldAlert } from "lucide-react";

import { PrintButton } from "@/components/workbook/print-button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { requireAdmin } from "@/lib/auth/session";
import { formatDateTime, formatShortDate } from "@/lib/dates";
import { periodLabel, type BiweeklyReport, type PatientReport, type ReportAlert } from "@/lib/reports/biweekly";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Informe quincenal", robots: { index: false } };

const ALERT_STYLE: Record<ReportAlert["level"], { icon: typeof Info; cls: string }> = {
  crit: { icon: ShieldAlert, cls: "bg-destructive/10 text-destructive" },
  warn: { icon: AlertTriangle, cls: "bg-warning-soft text-warning-strong" },
  info: { icon: Info, cls: "bg-muted text-muted-foreground" },
};

const WORKBOOK_STATUS: Record<string, string> = { draft: "En borrador", published: "Publicado" };

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data: row } = await supabase.from("clinical_reports").select("*").eq("id", id).maybeSingle();
  if (!row) notFound();
  if (!row.read_at) await supabase.from("clinical_reports").update({ read_at: new Date().toISOString() }).eq("id", id);
  const report = row.content as unknown as BiweeklyReport;
  const t = report.totals;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <Link href="/admin/informes" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground print:hidden">
        <ArrowLeft className="size-4" aria-hidden /> Todos los informes
      </Link>
      <PageHeader
        eyebrow={report.partial ? "Informe parcial" : "Informe quincenal"}
        title={periodLabel(report.period)}
        description={`Generado el ${formatDateTime(row.generated_at)}. ${report.partial ? "La quincena todavía no terminó: se completa sola al cierre." : ""} Ánimo, ejercicios y hábitos figuran solo de quienes comparten sus registros con vos.`}
      />
      <div className="print:hidden">
        <PrintButton label="Imprimir o guardar PDF" />
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Pacientes activos", t.patients],
          ["Sesiones", t.sessionsDone],
          ["Cancelaciones", t.cancelled],
          ["Ausencias", t.noShow],
          ["Con alerta de riesgo", t.withRisk],
          ["Para revisar", t.withAlerts],
          ["Sin actividad en la app", t.withoutActivity],
        ].map(([label, value]) => (
          <div key={label} className="surface-card p-4">
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
            <dd className="mt-1 font-display text-2xl tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      {report.patients.length ? (
        <ul className="grid gap-4">
          {report.patients.map((p) => (
            <PatientCard key={p.id} p={p} />
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground">No había pacientes activos en esta quincena.</p>
      )}
    </div>
  );
}

function PatientCard({ p }: { p: PatientReport }) {
  const s = p.sessions;
  return (
    <li className="surface-card space-y-4 p-5 break-inside-avoid">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <Link href={`/admin/pacientes/${p.id}`} className="font-display text-lg font-medium hover:underline">
          {p.name}
        </Link>
        {!p.shared ? <Badge variant="muted">No comparte registros</Badge> : null}
      </div>

      {p.alerts.length ? (
        <ul className="grid gap-1.5">
          {p.alerts.map((a, i) => {
            const { icon: Icon, cls } = ALERT_STYLE[a.level];
            return (
              <li key={i} className={`flex items-start gap-2 rounded-lg px-3 py-1.5 text-sm ${cls}`}>
                <Icon className="mt-0.5 size-4 shrink-0" aria-hidden /> {a.text}
              </li>
            );
          })}
        </ul>
      ) : null}

      <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
        <Item label="Sesiones">
          {s.done} realizadas{s.cancelled ? ` · ${s.cancelled} canceladas` : ""}{s.noShow ? ` · ${s.noShow} ausencias` : ""}
          <span className="block text-muted-foreground">{s.next ? `Próxima: ${formatDateTime(s.next)}` : "Sin próximo turno"}</span>
        </Item>
        {p.mood ? (
          <Item label="Ánimo (1 a 10)">
            {p.mood.avg !== null ? `Promedio ${p.mood.avg}` : "Sin ánimo registrado"}
            {p.mood.previous !== null ? <span className="text-muted-foreground"> · antes {p.mood.previous}</span> : null}
            <span className="block text-muted-foreground">{p.mood.logs} registros emocionales</span>
          </Item>
        ) : null}
        {p.practice ? (
          <Item label="Práctica y hábitos">
            {p.practice.exercises} ejercicios completados
            <span className="block text-muted-foreground">
              Días con hábitos: movimiento {p.practice.habitDays.movimiento} · descanso {p.practice.habitDays.descanso} · alimentación {p.practice.habitDays.alimentacion}
            </span>
          </Item>
        ) : null}
        {p.workbook ? (
          <Item label="Cuadernillo">
            {WORKBOOK_STATUS[p.workbook.status] ?? p.workbook.status}
            {p.workbook.status === "published" ? (
              <span className="block text-muted-foreground">
                {p.workbook.answered}{p.workbook.prompts ? ` de ${p.workbook.prompts}` : ""} consignas respondidas ({p.workbook.answeredInPeriod} en la quincena)
              </span>
            ) : null}
          </Item>
        ) : null}
      </dl>

      {p.tests.length ? (
        <div className="space-y-1.5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Tests respondidos</p>
          <ul className="grid gap-1 text-sm">
            {p.tests.map((x, i) => (
              <li key={i} className="flex flex-wrap gap-x-2">
                <span className="font-medium">{x.title}</span>
                {x.score !== null ? <span className="tabular-nums">{x.score}{x.max !== null ? `/${x.max}` : ""}</span> : null}
                {x.band ? <span className="text-muted-foreground">· {x.band}</span> : null}
                <span className="text-muted-foreground">· {formatShortDate(`${x.on}T12:00:00Z`, "UTC")}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </li>
  );
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}
