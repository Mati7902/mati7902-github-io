import { MessageCircle } from "lucide-react";

/** Botón flotante de WhatsApp para todo el sitio público. Es un enlace simple: funciona sin JavaScript. */
export function WhatsappFloat({ href, display }: { href: string; display: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Escribir por WhatsApp al ${display}`}
      className="fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 inline-flex h-14 items-center gap-2 rounded-full bg-[#0f7a6b] px-5 text-sm font-semibold text-white shadow-[var(--shadow-float)] transition-transform hover:scale-[1.03] hover:bg-[#0c6a5d] focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none print:hidden"
    >
      <MessageCircle className="size-6" aria-hidden />
      <span className="hidden sm:inline">WhatsApp</span>
    </a>
  );
}
