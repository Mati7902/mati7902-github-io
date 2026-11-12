"use client";

import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { generateWorkbookDraftAction } from "@/server/actions/workbooks";

export function GenerateDraftButton({ patientId }: { patientId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      onClick={() =>
        startTransition(async () => {
          const r = await generateWorkbookDraftAction(patientId);
          if (!r.ok) return void toast.error(r.error);
          toast.success("Borrador armado. Revisalo antes de publicar.");
          router.refresh();
        })
      }
      loading={pending}
    >
      <Sparkles aria-hidden /> Armar borrador desde la ficha
    </Button>
  );
}
