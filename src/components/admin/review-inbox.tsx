"use client";

import { AlertTriangle, BookMarked, Check, ClipboardCheck, FileText } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { markReviewedAction } from "@/server/actions/review-inbox";
import type { InboxItem } from "@/server/services/review-inbox";

const ICON = { risk: AlertTriangle, intake: FileText, workbook: BookMarked, test: ClipboardCheck } as const;
const TONE = { risk: "bg-destructive/10 text-destructive", intake: "bg-primary-soft text-primary", workbook: "bg-warning-soft text-warning-strong", test: "bg-info-soft text-info-strong" } as const;

/** Bandeja «Para revisar»: lo urgente primero. Las fichas y los tests se marcan como revisados. */
export function ReviewInbox({ items, timezone }: { items: InboxItem[]; timezone: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  if (items.length === 0) return <p className="rounded-2xl border border-dashed border-border bg-card/60 px-5 py-4 text-sm text-muted-foreground">Nada pendiente de revisar.</p>;
  return (
    <ul className="divide-y divide-divider overflow-hidden rounded-2xl border border-border/70 bg-card">
      {items.slice(0, 12).map((item) => {
        const Icon = ICON[item.kind];
        return (
          <li key={item.key} className="flex items-center gap-3 px-4 py-3">
            <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${TONE[item.kind]}`}>
              <Icon className="size-4" aria-hidden />
            </span>
            <Link href={item.href} className="min-w-0 flex-1 hover:underline">
              <span className={`block text-sm font-medium ${item.kind === "risk" ? "text-destructive" : ""}`}>{item.title}</span>
              <span className="text-xs text-muted-foreground">
                {item.detail} · {new Intl.DateTimeFormat("es-PY", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: timezone }).format(new Date(item.at))}
              </span>
            </Link>
            {item.review ? (
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={`Marcar como revisado: ${item.title}`}
                title="Marcar como revisado"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const r = await markReviewedAction(item.review!);
                    if (!r.ok) return void toast.error(r.error);
                    router.refresh();
                  })
                }
              >
                <Check />
              </Button>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
