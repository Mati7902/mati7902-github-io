import { ArrowRight, MessageCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { FaqList } from "@/components/public/faq-list";
import { Button } from "@/components/ui/button";
import { brandPhoto } from "@/lib/brand";
import { seoDefaults } from "@/lib/config/site";
import { publicWhatsapp, whatsappLink } from "@/lib/contact";
import { publicEnv } from "@/lib/env";
import { modalityMode } from "@/lib/modalities";
import { fill, landingPageBySlug, type LandingContext } from "@/lib/seo/landing-pages";
import { pageMetadata } from "@/lib/seo/metadata";
import { buildLandingGraph } from "@/lib/seo/schema";
import { getPublicSettingsSafe } from "@/server/services/public-settings";

async function load(slug: string) {
  const page = landingPageBySlug(slug);
  if (!page) throw new Error(`Página de aterrizaje desconocida: ${slug}`);
  const { "site.identity": identity, scheduling, landing } = await getPublicSettingsSafe();
  const mode = modalityMode(scheduling.modalities_enabled);
  const ctx: LandingContext = { nombre: identity.professional_name, matricula: identity.license, whatsapp: publicWhatsapp(identity).display, mode, country: identity.country };
  return { page, identity, landing, mode, ctx };
}

export async function landingMetadata(slug: string): Promise<Metadata> {
  const { page, ctx } = await load(slug);
  return pageMetadata({ title: page.metaTitle, description: fill(page.metaDescription, ctx), path: page.path, absoluteTitle: true });
}

export async function SeoLandingPage({ slug }: { slug: string }) {
  const { page, identity, landing, mode, ctx } = await load(slug);
  const faqs = page.faqs.map((f) => ({ question: fill(f.question, ctx), answer: fill(f.answer, ctx) }));
  const jsonLd = buildLandingGraph({
    baseUrl: publicEnv.appUrl,
    identity,
    imageUrl: new URL(brandPhoto(identity), publicEnv.appUrl).toString(),
    specialties: landing.specialties.map((s) => s.title),
    mode,
    path: page.path,
    name: page.name,
    description: fill(page.metaDescription, ctx),
    faqs,
  });
  const related = page.related.map((s) => landingPageBySlug(s)).filter((p): p is NonNullable<typeof p> => Boolean(p));
  const waHref = whatsappLink(identity);
  const wa = publicWhatsapp(identity);

  return (
    <article className="mx-auto max-w-3xl px-5 py-14 lg:py-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav aria-label="Migas de pan" className="text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Inicio</Link> <span aria-hidden>/</span> <span>{page.name}</span>
      </nav>
      <h1 className="mt-4 font-display text-4xl leading-tight font-medium sm:text-5xl">{page.h1}</h1>
      <p className="mt-6 text-lg leading-relaxed text-foreground">{fill(page.lead, ctx)}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button asChild size="lg" className="h-auto min-h-13 max-w-full py-3 whitespace-normal">
          <a href={waHref} target="_blank" rel="noopener noreferrer">
            <MessageCircle aria-hidden /> Escribir por WhatsApp {wa.display}
          </a>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/#solicitar-turno">
            Solicitar turno <ArrowRight aria-hidden />
          </Link>
        </Button>
      </div>

      <div className="mt-12 space-y-10">
        {page.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="font-display text-2xl font-medium sm:text-3xl">{fill(section.heading, ctx)}</h2>
            <div className="mt-3 space-y-4 text-base leading-relaxed text-muted-foreground">
              {section.paragraphs?.map((p) => <p key={p}>{fill(p, ctx)}</p>)}
              {section.bullets ? (
                <ul className="list-disc space-y-2 pl-5 marker:text-mint-600">
                  {section.bullets.map((b) => <li key={b}>{fill(b, ctx)}</li>)}
                </ul>
              ) : null}
            </div>
          </section>
        ))}
      </div>

      <section className="mt-14">
        <h2 className="mb-5 font-display text-2xl font-medium sm:text-3xl">Preguntas frecuentes</h2>
        <FaqList faqs={faqs} />
      </section>

      <section className="mt-14 rounded-3xl border border-border/70 bg-card p-7">
        <h2 className="font-display text-xl font-medium">Pedí tu primer turno</h2>
        <p className="mt-2 text-muted-foreground">Escribime por WhatsApp al {wa.display} y coordinamos día, hora y modalidad.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button asChild>
            <a href={waHref} target="_blank" rel="noopener noreferrer">
              <MessageCircle aria-hidden /> WhatsApp
            </a>
          </Button>
          {related.map((r) => (
            <Button key={r.slug} asChild variant="outline" className="h-auto max-w-full py-2.5 text-center whitespace-normal">
              <Link href={r.path}>{r.name}</Link>
            </Button>
          ))}
        </div>
      </section>

      <p className="mt-10 text-xs text-subtle-foreground">
        {identity.professional_name} · {identity.professional_title} · {identity.license} · Actualizado en {seoDefaults.contentUpdatedLabel}. Esta página es informativa: no reemplaza una evaluación profesional ni los servicios de emergencia.
      </p>
    </article>
  );
}

