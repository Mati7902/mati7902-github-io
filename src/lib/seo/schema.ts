import { seoDefaults } from "@/lib/config/site";
import { publicWhatsapp } from "@/lib/contact";
import { homeTitle } from "@/lib/seo/metadata";
import type { ModalityMode } from "@/lib/modalities";
import type { AvailabilityRule, Faq, TherapyPlan } from "@/types/domain";

/** Subconjunto de la identidad que usa el marcado (evita acoplar este módulo a los servicios del servidor). */
export type SeoIdentity = {
  platform_name: string;
  professional_name: string;
  professional_title: string;
  license: string;
  country: string;
  tagline: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  location_name: string | null;
  location_address: string | null;
  links: { instagram: string | null; linkedin: string | null; website: string | null };
};

export type FaqLike = Pick<Faq, "question" | "answer">;

export type SeoInput = {
  baseUrl: string;
  identity: SeoIdentity;
  imageUrl: string;
  plans?: TherapyPlan[];
  availability?: AvailabilityRule[];
  specialties?: string[];
  mode: ModalityMode;
};

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const KNOWS_ABOUT = ["Terapia cognitivo-conductual", "Terapia de aceptación y compromiso", "Terapia dialéctico-conductual", "Neurociencia aplicada a la psicoterapia"];

const url = (base: string, path = "/") => new URL(path, base).toString();

export function buildEntities(input: SeoInput) {
  const { baseUrl, identity, imageUrl, plans = [], availability = [], specialties = [], mode } = input;
  const home = url(baseUrl);
  const wa = publicWhatsapp(identity);
  const sameAs = [identity.links.instagram, identity.links.linkedin, identity.links.website].filter((v): v is string => Boolean(v));

  const person = {
    "@type": "Person",
    "@id": `${home}#person`,
    name: identity.professional_name,
    jobTitle: identity.professional_title,
    description: identity.tagline,
    image: imageUrl,
    url: home,
    worksFor: { "@id": `${home}#practice` },
    hasCredential: {
      "@type": "EducationalOccupationalCredential",
      credentialCategory: "Matrícula profesional",
      identifier: identity.license,
      recognizedBy: { "@type": "Country", name: identity.country },
    },
    knowsAbout: [...KNOWS_ABOUT, ...specialties],
    ...(sameAs.length ? { sameAs } : {}),
  };

  const offers = plans.map((p) => ({
    "@type": "Offer",
    itemOffered: { "@type": "Service", name: p.name, ...(p.short_description ? { description: p.short_description } : {}) },
    ...(p.price_amount != null && p.price_amount > 0 ? { price: p.price_amount, priceCurrency: p.currency } : {}),
  }));

  const hours = availability.map((r) => ({
    "@type": "OpeningHoursSpecification",
    dayOfWeek: DAYS[r.weekday],
    opens: r.start_time.slice(0, 5),
    closes: r.end_time.slice(0, 5),
  }));

  const practice = {
    // Tipos que schema.org define para un consultorio profesional de salud.
    "@type": ["ProfessionalService", "MedicalBusiness"],
    "@id": `${home}#practice`,
    name: identity.platform_name,
    description: identity.tagline,
    url: home,
    image: imageUrl,
    founder: { "@id": `${home}#person` },
    telephone: wa.e164,
    ...(identity.email ? { email: identity.email } : {}),
    ...(mode !== "online" && identity.location_address
      ? { address: { "@type": "PostalAddress", streetAddress: identity.location_address, addressLocality: seoDefaults.city, addressRegion: seoDefaults.region, addressCountry: "PY" } }
      : {}),
    areaServed: [
      { "@type": "City", name: seoDefaults.city, containedInPlace: { "@type": "AdministrativeArea", name: seoDefaults.region, containedInPlace: { "@type": "Country", name: identity.country } } },
      ...(mode !== "presencial" ? [{ "@type": "Country", name: identity.country }] : []),
    ],
    ...(mode !== "presencial" ? { availableChannel: { "@type": "ServiceChannel", name: "Videoconsulta", serviceUrl: home } } : {}),
    contactPoint: { "@type": "ContactPoint", contactType: "reservas", telephone: wa.e164, availableLanguage: ["es"], url: `https://wa.me/${wa.digits}` },
    knowsLanguage: "es",
    ...(hours.length ? { openingHoursSpecification: hours } : {}),
    ...(offers.length ? { hasOfferCatalog: { "@type": "OfferCatalog", name: "Planes de atención", itemListElement: offers } } : {}),
    ...(sameAs.length ? { sameAs } : {}),
  };

  const website = {
    "@type": "WebSite",
    "@id": `${home}#website`,
    url: home,
    name: identity.platform_name,
    inLanguage: "es-PY",
    publisher: { "@id": `${home}#practice` },
  };

  return { home, person, practice, website };
}

export function faqNode(pageUrl: string, faqs: FaqLike[]) {
  if (faqs.length === 0) return null;
  return {
    "@type": "FAQPage",
    "@id": `${pageUrl}#faq`,
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
  };
}

/** Grafo de la página de inicio. FAQPage solo incluye las preguntas que se muestran en la página. */
export function buildHomeGraph(input: SeoInput & { description: string; faqs: FaqLike[] }) {
  const { home, person, practice, website } = buildEntities(input);
  const webpage = {
    "@type": "WebPage",
    "@id": `${home}#webpage`,
    url: home,
    name: homeTitle(input.identity.professional_name),
    description: input.description,
    inLanguage: "es-PY",
    isPartOf: { "@id": `${home}#website` },
    about: { "@id": `${home}#practice` },
    mainEntity: { "@id": `${home}#person` },
    dateModified: seoDefaults.contentUpdated,
  };
  const faq = faqNode(home, input.faqs);
  return { "@context": "https://schema.org", "@graph": [person, practice, website, webpage, ...(faq ? [faq] : [])] };
}

export type LandingSchemaInput = SeoInput & {
  path: string;
  name: string;
  description: string;
  faqs: FaqLike[];
};

/** Grafo de una página de aterrizaje: WebPage + migas de pan + FAQPage, apuntando a las mismas entidades de la home. */
export function buildLandingGraph(input: LandingSchemaInput) {
  const { home, person, practice, website } = buildEntities(input);
  const pageUrl = url(input.baseUrl, input.path);
  const webpage = {
    "@type": "WebPage",
    "@id": `${pageUrl}#webpage`,
    url: pageUrl,
    name: input.name,
    description: input.description,
    inLanguage: "es-PY",
    isPartOf: { "@id": `${home}#website` },
    about: { "@id": `${home}#practice` },
    author: { "@id": `${home}#person` },
    dateModified: seoDefaults.contentUpdated,
    breadcrumb: { "@id": `${pageUrl}#breadcrumb` },
  };
  const breadcrumb = {
    "@type": "BreadcrumbList",
    "@id": `${pageUrl}#breadcrumb`,
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: home },
      { "@type": "ListItem", position: 2, name: input.name, item: pageUrl },
    ],
  };
  const faq = faqNode(pageUrl, input.faqs);
  return { "@context": "https://schema.org", "@graph": [person, practice, website, webpage, breadcrumb, ...(faq ? [faq] : [])] };
}
