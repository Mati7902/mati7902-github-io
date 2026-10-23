import { CalendarDays, Clock, MapPin, Navigation } from "lucide-react";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { formatCompactDate, toDateKey } from "@/lib/dates";
import { describeRule, directionsUrl, mapEmbedUrl, nextRuleDates } from "@/lib/locations";
import type { AvailabilityRule, PracticeLocation } from "@/types/domain";

/**
 * "Dónde atiendo": una tarjeta por sede activa con foto (si se subió), mapa, dirección,
 * horarios y las próximas fechas. Los horarios salen de las franjas de la agenda con esa sede,
 * así lo que se ve acá es lo mismo que se puede reservar.
 */
export function LocationsSection({ locations, rules, timezone }: { locations: PracticeLocation[]; rules: AvailabilityRule[]; timezone: string }) {
  if (locations.length === 0) return null;
  const today = toDateKey(new Date(), timezone);

  return (
    <section id="sedes" className="scroll-mt-20">
      <div className="mx-auto max-w-6xl px-5 py-20 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-wider text-accent-strong">Atención presencial</p>
          <h2 className="mt-3 font-display text-3xl font-medium sm:text-4xl">Dónde atiendo</h2>
          <p className="mt-4 text-lg text-muted-foreground">Las sesiones presenciales son en {locations.length === 1 ? "esta sede" : "estas sedes"}. Al reservar ves en qué lugar es cada horario.</p>
        </div>
        <div className={`mt-10 grid gap-6 ${locations.length > 1 ? "lg:grid-cols-2" : ""}`}>
          {locations.map((place) => {
            const own = rules.filter((r) => r.location_id === place.id && r.is_active);
            const upcoming = [...new Set(own.flatMap((r) => nextRuleDates(r, today, 3)))].sort().slice(0, 3);
            return (
              <article key={place.id} className="flex min-w-0 flex-col overflow-hidden rounded-3xl border border-border/70 bg-card shadow-[var(--shadow-card)]">
                {place.photo_url ? (
                  <div className="relative aspect-[16/9] w-full bg-surface-muted">
                    <Image src={place.photo_url} alt={`Fachada de ${place.name}`} fill sizes="(min-width: 1024px) 560px, 100vw" className="object-cover" />
                  </div>
                ) : null}
                <div className="flex flex-1 flex-col gap-4 p-6 sm:p-7">
                  <div>
                    <h3 className="font-display text-2xl font-medium">{place.name}</h3>
                    <p className="mt-2 flex items-start gap-2 text-muted-foreground">
                      <MapPin className="mt-1 size-4 shrink-0 text-primary" aria-hidden />
                      <span>
                        {place.address}
                        {place.city ? <span className="block">{place.city}</span> : null}
                      </span>
                    </p>
                  </div>
                  {own.length > 0 ? (
                    <ul className="space-y-1.5 text-sm">
                      {own.map((r) => (
                        <li key={r.id} className="flex items-start gap-2">
                          <Clock className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden /> {describeRule(r)}
                        </li>
                      ))}
                      {upcoming.length > 0 ? (
                        <li className="flex items-start gap-2 text-muted-foreground">
                          <CalendarDays className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden /> Próximas fechas: {upcoming.map((d) => formatCompactDate(`${d}T12:00:00`, timezone)).join(" · ")}
                        </li>
                      ) : null}
                    </ul>
                  ) : null}
                  {place.notes ? <p className="text-sm text-muted-foreground">{place.notes}</p> : null}
                  <div className="overflow-hidden rounded-2xl border border-border/70">
                    <iframe
                      title={`Mapa de ${place.name}`}
                      src={mapEmbedUrl(place)}
                      className="aspect-[16/10] w-full max-w-full border-0"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </div>
                  <div className="mt-auto">
                    <Button asChild variant="outline">
                      <a href={directionsUrl(place)} target="_blank" rel="noopener noreferrer">
                        <Navigation aria-hidden /> Cómo llegar
                      </a>
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
