import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PrintButton } from "@/components/workbook/print-button";
import { WorkbookDocument } from "@/components/workbook/workbook-document";
import { requireAdmin } from "@/lib/auth/session";
import { formatLongDate } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { stepsForSlugs } from "@/server/services/workbook-print";
import { getAdminWorkbook } from "@/server/services/workbooks";
import { getSettings } from "@/server/services/settings";

export const metadata: Metadata = { title: "Cuadernillo · vista PDF", robots: { index: false } };

/** Vista previa imprimible de la última versión (la que se está editando). */
export default async function AdminWorkbookPrintPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: patient }, workbook, { "site.identity": identity, scheduling }] = await Promise.all([
    supabase.from("patients").select("first_name").eq("id", id).maybeSingle(),
    getAdminWorkbook(supabase, id),
    getSettings(supabase, ["site.identity", "scheduling"] as const),
  ]);
  if (!patient || !workbook) notFound();
  const content = workbook.latest.content;
  const steps = await stepsForSlugs(supabase, content.items.map((i) => i.slug));
  return (
    <div className="space-y-6 bg-white p-4">
      <div className="wb-noprint flex flex-wrap items-center gap-3">
        <PrintButton />
        <p className="text-sm text-muted-foreground">Versión {workbook.latest.version}{workbook.publishedVersion === workbook.latest.version ? " (publicada)" : " (sin publicar)"}. En el diálogo elegí «Guardar como PDF».</p>
      </div>
      <WorkbookDocument content={content} firstName={patient.first_name} dateLabel={formatLongDate(new Date(), scheduling.timezone)} professional={{ name: identity.professional_name, title: identity.professional_title, license: identity.license }} steps={steps} />
    </div>
  );
}
