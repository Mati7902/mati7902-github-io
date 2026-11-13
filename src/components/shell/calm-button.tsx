"use client";

import { Wind } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * «Calmarme» siempre a un toque, en todas las pantallas del paciente. En un momento difícil nadie
 * busca en menús. Se oculta dentro de Calmarme y en pantallas que ya tienen su propio botón fijo.
 */
export function CalmButton() {
  const pathname = usePathname();
  if (pathname.startsWith("/app/calmarme") || pathname.startsWith("/app/ingreso") || pathname.startsWith("/app/consentimiento")) return null;
  return (
    <Link
      href="/app/calmarme"
      className="fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] z-40 inline-flex h-12 items-center gap-2 rounded-full bg-mint-700 px-4 text-sm font-semibold text-white shadow-[var(--shadow-float)] transition-transform hover:scale-[1.03] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:right-8 md:bottom-8 print:hidden"
    >
      <Wind className="size-5" aria-hidden /> Calmarme
    </Link>
  );
}
