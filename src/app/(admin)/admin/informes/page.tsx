import type { Metadata } from "next";
import Link from "next/link";
import { FileText } from "lucide-react";

import { GenerateReportButtons } from "@/components/admin/reports/generate-report-buttons";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { requireAdmin } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/dates";
import { periodLabel, type BiweeklyReport } from "@/lib/reports/biweekly";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Informes" };
export const maxDuration = 60;

export default async function ReportsPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data: reports } = await supabase.from("clinical_reports").select("id, period_start, period_end, content, generated_at, read_at").order("period_start", { ascending: false }).limit(48);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <PageHeader
        eyebrow="Seguimiento"
        title="Informes quincenales"
        description="El 1 y el 16 de cada mes se arma solo el informe de la quincena que terminó, con todos tus pacientes activos. Te llega un aviso cuando está listo."
      />
      <GenerateReportButtons />
      {reports?.length ? (
        <ul className="grid gap-3">
          {reports.map((r) => {
            const c = r.content as unknown as BiweeklyReport;
            return (
              <li key={r.id}>
                <Link href={`/admin/informes/${r.id}`} className="surface-card flex flex-wrap items-center justify-between gap-3 p-4 transition-colors hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-ring">
                  <div className="min-w-0 space-y-1">
                    <p className="flex flex-wrap items-center gap-2 font-medium">
                      {periodLabel({ start: r.period_start, end: r.period_end })}
                      {!r.read_at ? <Badge variant="soft">Nuevo</Badge> : null}
                      {c.partial ? <Badge variant="muted">Parcial</Badge> : null}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {c.totals.patients} pacientes · {c.totals.sessionsDone} sesiones · generado el {formatDateTime(r.generated_at)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {c.totals.withRisk ? <Badge variant="destructive">{c.totals.withRisk} con riesgo</Badge> : null}
                    {c.totals.withAlerts ? <Badge variant="warning">{c.totals.withAlerts} para revisar</Badge> : null}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState icon={FileText} title="Todavía no hay informes" description="El primero sale el próximo 1 o 16. Si querés verlo ya, generá la quincena en curso." />
      )}
    </div>
  );
}
