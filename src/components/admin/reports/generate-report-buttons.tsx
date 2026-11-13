"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { generateReportAction } from "@/server/actions/reports";

export function GenerateReportButtons() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const run = (which: "current" | "previous") =>
    startTransition(async () => {
      const r = await generateReportAction({ which });
      if (!r.ok) return void toast.error(r.error);
      router.push(`/admin/informes/${r.data.id}`);
    });
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" onClick={() => run("current")} disabled={pending}>
        <RefreshCw aria-hidden className={pending ? "animate-spin" : undefined} /> Generar la quincena en curso
      </Button>
      <Button type="button" variant="outline" onClick={() => run("previous")} disabled={pending}>
        Rehacer la quincena anterior
      </Button>
    </div>
  );
}
