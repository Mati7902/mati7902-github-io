import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PrintButton } from "@/components/workbook/print-button";
import { WorkbookDocument } from "@/components/workbook/workbook-document";
import { requirePatient } from "@/lib/auth/session";
import { formatLongDate } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { getPublicSettingsSafe } from "@/server/services/public-settings";
import { getSetting } from "@/server/services/settings";
import { stepsForSlugs } from "@/server/services/workbook-print";
import { getMyWorkbook } from "@/server/services/workbooks";

export const metadata: Metadata = { title: "Mi cuadernillo · imprimir" };

export default async function MyWorkbookPrintPage() {
  const { patient } = await requirePatient();
  const supabase = await createClient();
  const workbook = await getMyWorkbook(supabase);
  if (!workbook) redirect("/app/cuadernillo");
  const [{ "site.identity": identity }, scheduling, steps] = await Promise.all([
    getPublicSettingsSafe(),
    getSetting(supabase, "scheduling"),
    stepsForSlugs(supabase, workbook.content.items.map((i) => i.slug)),
  ]);
  return (
    <div className="space-y-6">
      <div className="wb-noprint">
        <PrintButton />
      </div>
      <WorkbookDocument content={workbook.content} firstName={patient.first_name} dateLabel={formatLongDate(workbook.publishedAt, scheduling.timezone)} professional={{ name: identity.professional_name, title: identity.professional_title, license: identity.license }} steps={steps} />
    </div>
  );
}
