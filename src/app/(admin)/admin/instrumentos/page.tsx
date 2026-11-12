import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";

import { InstrumentForm } from "@/components/admin/instruments/instrument-form";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { requireAdmin } from "@/lib/auth/session";
import { toDateKey } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { ASSIGNABLE_TESTS } from "@/lib/clinical/focus";

export const metadata: Metadata = { title: "Instrumentos" };

export default async function InstrumentsPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data: instruments } = await supabase.from("instruments").select("*").order("short_name");
  const today = toDateKey(new Date());

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <PageHeader
        eyebrow="Psicometría"
        title="Instrumentos"
        description="Tests de uso libre que el paciente responde en la app, e instrumentos con licencia de los que se registran solo los resultados."
      />

      <section className="space-y-3">
        <h2 className="font-display text-xl font-medium">De uso libre, en la app ({ASSIGNABLE_TESTS.length})</h2>
        <p className="text-sm text-muted-foreground">Se asignan desde la ficha del paciente; el puntaje lo calcula la plataforma.</p>
        <ul className="flex flex-wrap gap-2">
          {ASSIGNABLE_TESTS.map((t) => (
            <li key={t.id} className="rounded-full border border-border/70 bg-card px-3 py-1.5 text-sm" title={t.license}>
              <span className="font-medium">{t.name}</span> <span className="text-muted-foreground">· {t.domain}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl font-medium">Con licencia: solo resultados</h2>
        <p className="flex items-start gap-2 rounded-2xl bg-surface-muted px-4 py-3 text-sm text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden /> Comprar el material no autoriza a reproducirlo en una plataforma propia. Estos instrumentos se aplican por el canal autorizado (papel, plataforma del editor, entrevista) y acá se carga el puntaje y la interpretación según el manual. Los datos de cada licencia son orientativos: confirmalos con el titular.
        </p>
        <ul className="space-y-4">
          {(instruments ?? []).map((i) => {
            const expired = i.license_expires_on !== null && i.license_expires_on < today;
            return (
              <li key={i.id}>
                <details className="surface-card group p-5">
                  <summary className="flex cursor-pointer flex-wrap items-center gap-2">
                    <span className="font-display text-lg font-medium">{i.short_name}</span>
                    <span className="text-sm text-muted-foreground">{i.name}</span>
                    <span className="ml-auto flex flex-wrap gap-1.5">
                      {!i.is_active ? <Badge variant="muted">Inactivo</Badge> : null}
                      {expired ? <Badge variant="destructive">Licencia vencida</Badge> : null}
                      <Badge variant={i.digital_permission ? "success" : "muted"}>{i.digital_permission ? "Permiso digital" : "Sin permiso digital"}</Badge>
                    </span>
                  </summary>
                  <div className="mt-5 border-t border-divider pt-5">
                    <InstrumentForm instrument={i} />
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
        <details className="surface-card p-5">
          <summary className="cursor-pointer font-medium">Agregar otro instrumento</summary>
          <div className="mt-5">
            <InstrumentForm />
          </div>
        </details>
      </section>
    </div>
  );
}
