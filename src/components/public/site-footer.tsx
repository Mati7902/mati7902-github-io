import Link from "next/link";

import { BrandMark } from "@/components/shell/brand-mark";
import { brandLogo } from "@/lib/brand";
import { publicWhatsapp, whatsappLink } from "@/lib/contact";
import { landingPages } from "@/lib/seo/landing-pages";
import type { SiteIdentity } from "@/server/services/settings";

export function SiteFooter({ identity }: { identity: SiteIdentity }) {
  return (
    <footer className="border-t border-border/60 bg-card">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 md:grid-cols-4 lg:px-8">
        <div className="min-w-0 space-y-2">
          <p className="text-lg">
            <BrandMark name={identity.professional_name} subtitle={identity.brand_subtitle} logoUrl={brandLogo(identity)} />
          </p>
          <p className="text-sm text-muted-foreground">
            {identity.professional_name} · {identity.professional_title}
            <br />
            {identity.license} · {identity.country}
          </p>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-medium">Contacto</p>
          <ul className="space-y-1 text-muted-foreground">
            {identity.email ? (
              <li>
                <a href={`mailto:${identity.email}`} className="hover:text-foreground">
                  {identity.email}
                </a>
              </li>
            ) : null}
            <li>
              <a href={whatsappLink(identity)} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
                WhatsApp {publicWhatsapp(identity).display}
              </a>
            </li>
            {identity.location_address ? <li>{identity.location_address}</li> : null}
                      </ul>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-medium">Atención</p>
          <ul className="space-y-1 text-muted-foreground">
            {landingPages.map((p) => (
              <li key={p.slug}>
                <Link href={p.path} className="hover:text-foreground">{p.name}</Link>
              </li>
            ))}
            <li>
              <Link href="/planes" className="hover:text-foreground">Planes de atención</Link>
            </li>
          </ul>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-medium">Legal</p>
          <ul className="space-y-1 text-muted-foreground">
            <li>
              <Link href="/privacidad" className="hover:text-foreground">Política de privacidad</Link>
            </li>
            <li>
              <Link href="/terminos" className="hover:text-foreground">Términos de uso</Link>
            </li>
            <li>
              <Link href="/login" className="hover:text-foreground">Acceso pacientes</Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/60 px-5 py-4 text-center text-xs text-subtle-foreground">
        Esta plataforma es un apoyo administrativo y entre sesiones. No reemplaza la atención profesional ni los servicios de emergencia.
      </div>
    </footer>
  );
}
