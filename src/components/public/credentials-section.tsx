import { Award, BookOpen, ExternalLink } from "lucide-react";

import { CERTIFICATES, PUBLICATIONS } from "@/lib/credentials";

/** Publicaciones científicas y certificados verificables, dentro de "Sobre mí". */
export function CredentialsSection() {
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="min-w-0 space-y-4">
        <h3 className="flex items-center gap-2 font-display text-2xl font-medium">
          <BookOpen className="size-5 text-primary" aria-hidden /> Artículos científicos
        </h3>
        <ul className="space-y-3">
          {PUBLICATIONS.map((p) => (
            <li key={p.doi} className="rounded-2xl border border-border/70 bg-background p-5">
              <p className="font-medium leading-snug text-foreground">{p.title}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {p.authors} ({p.year}). <em>{p.journal}</em>.
              </p>
              <a href={`https://doi.org/${p.doi}`} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 break-all text-sm font-medium text-primary underline-offset-4 hover:underline">
                doi.org/{p.doi} <ExternalLink className="size-3.5 shrink-0" aria-hidden />
              </a>
            </li>
          ))}
        </ul>
      </div>
      <div className="min-w-0 space-y-4">
        <h3 className="flex items-center gap-2 font-display text-2xl font-medium">
          <Award className="size-5 text-primary" aria-hidden /> Formación complementaria
        </h3>
        <ul className="space-y-3">
          {CERTIFICATES.map((c) => (
            <li key={c.verifyUrl} className="rounded-2xl border border-border/70 bg-background p-5">
              <p className="font-medium leading-snug text-foreground">{c.title}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {c.issuer} · {c.platform} · {c.date}
              </p>
              <a href={c.verifyUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline">
                Ver certificado verificado <ExternalLink className="size-3.5 shrink-0" aria-hidden />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
