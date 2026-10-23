import { MessageCircle } from "lucide-react";

/** Franja fina sobre el encabezado: el WhatsApp siempre a la vista, también en el celular. */
export function ContactBar({ href, display, tagline }: { href: string; display: string; tagline: string }) {
  return (
    <div className="bg-primary text-primary-foreground">
      <div className="mx-auto flex max-w-6xl items-center justify-center gap-x-4 gap-y-1 px-5 py-1.5 text-sm sm:justify-between lg:px-8">
        <p className="hidden sm:block">{tagline}</p>
        <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 font-medium hover:underline">
          <MessageCircle className="size-4" aria-hidden />
          <span>WhatsApp</span>
          <span className="tabular-nums">{display}</span>
        </a>
      </div>
    </div>
  );
}
