import { describe, expect, it } from "vitest";

import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { formatWhatsappDisplay, normalizeWhatsappNumber, publicWhatsapp, whatsappLink } from "@/lib/contact";
import { attentionSentence, fill, landingPages } from "@/lib/seo/landing-pages";
import { buildLlmsFullTxt, buildLlmsTxt } from "@/lib/seo/llms";
import { homeDescription, homeTitle, pageMetadata } from "@/lib/seo/metadata";
import { buildHomeGraph, buildLandingGraph, type SeoIdentity } from "@/lib/seo/schema";
import type { AvailabilityRule, TherapyPlan } from "@/types/domain";

const identity: SeoIdentity = {
  platform_name: "Psicología Matías Sánchez",
  professional_name: "Lic. Matías Sánchez",
  professional_title: "Psicólogo",
  license: "RP 14394-LP",
  country: "Paraguay",
  tagline: "Un espacio para comprender lo que te pasa.",
  email: null,
  phone: null,
  whatsapp: null,
  location_name: null,
  location_address: null,
  links: { instagram: null, linkedin: null, website: null },
};

const base = "https://example.com";
const rule = (weekday: number, start: string, end: string) => ({ weekday, start_time: start, end_time: end }) as AvailabilityRule;

describe("WhatsApp público", () => {
  it("usa el número del consultorio cuando Configuración no tiene uno", () => {
    const wa = publicWhatsapp({ whatsapp: null });
    expect(wa.digits).toBe("595985569077");
    expect(wa.display).toBe("+595 985 569 077");
    expect(wa.e164).toBe("+595985569077");
  });

  it("respeta el número configurado y normaliza formatos locales", () => {
    expect(publicWhatsapp({ whatsapp: "0981 123 456" }).digits).toBe("595981123456");
    expect(normalizeWhatsappNumber("+595 (985) 569-077")).toBe("595985569077");
    expect(formatWhatsappDisplay("+1 415 555 0100")).toBe("+14155550100");
    expect(publicWhatsapp({ whatsapp: "  " }).digits).toBe("595985569077");
  });

  it("arma el enlace wa.me con el mensaje precodificado", () => {
    const link = whatsappLink({ whatsapp: null });
    expect(link.startsWith("https://wa.me/595985569077?text=")).toBe(true);
    expect(decodeURIComponent(link.split("text=")[1]!)).toBe("Hola Lic. Matías, quisiera consultar por una sesión de psicología.");
  });
});

describe("metadatos", () => {
  it("el título y la descripción de la home incluyen la intención local y entran en los largos recomendados", () => {
    expect(homeTitle("Lic. Matías Sánchez")).toContain("Psicólogo en Encarnación, Paraguay");
    expect(homeTitle("Lic. Matías Sánchez").length).toBeLessThanOrEqual(65);
    for (const mode of ["online", "presencial", "mixta"] as const) {
      const d = homeDescription("RP 14394-LP", mode);
      expect(d).toContain("Encarnación");
      expect(d.length).toBeLessThanOrEqual(160);
    }
    expect(homeDescription("RP 14394-LP", "online")).toContain("online");
    expect(homeDescription("RP 14394-LP", "online")).not.toContain("presencial");
  });

  it("cada página define canonical y repite la imagen de Open Graph", () => {
    const m = pageMetadata({ title: "T", description: "D", path: "/planes" });
    expect(m.alternates?.canonical).toBe("/planes");
    expect(m.openGraph?.images).toBeTruthy();
    expect(m.twitter).toMatchObject({ card: "summary_large_image" });
  });
});

describe("datos estructurados", () => {
  const faqs = [{ question: "¿Cómo pido turno?", answer: "Por WhatsApp." }];
  const plans = [{ name: "Consulta individual", short_description: null, price_amount: 150000, currency: "PYG" }] as TherapyPlan[];
  const graph = buildHomeGraph({ baseUrl: base, identity, imageUrl: `${base}/foto.webp`, plans, availability: [rule(1, "09:00:00", "12:00:00")], specialties: ["Ansiedad"], mode: "online", description: "desc", faqs });
  const nodes = graph["@graph"] as Record<string, unknown>[];
  const byType = (t: string) => nodes.find((n) => (Array.isArray(n["@type"]) ? n["@type"].includes(t) : n["@type"] === t));

  it("incluye persona, consultorio, sitio, página y preguntas frecuentes", () => {
    expect(byType("Person")).toMatchObject({ name: "Lic. Matías Sánchez", jobTitle: "Psicólogo" });
    expect(byType("ProfessionalService")).toMatchObject({ telephone: "+595985569077" });
    expect(byType("WebSite")).toBeTruthy();
    expect(byType("WebPage")).toBeTruthy();
    expect(byType("FAQPage")).toBeTruthy();
  });

  it("no inventa reseñas, valoraciones ni dirección postal", () => {
    const json = JSON.stringify(graph);
    expect(json).not.toContain("Review");
    expect(json).not.toContain("AggregateRating");
    expect(json).not.toContain("PostalAddress");
  });

  it("solo publica dirección postal si hay consultorio físico configurado", () => {
    const withAddress = buildHomeGraph({ baseUrl: base, identity: { ...identity, location_address: "Calle 1" }, imageUrl: "x", mode: "mixta", description: "d", faqs: [] });
    expect(JSON.stringify(withAddress)).toContain("PostalAddress");
    const onlineOnly = buildHomeGraph({ baseUrl: base, identity: { ...identity, location_address: "Calle 1" }, imageUrl: "x", mode: "online", description: "d", faqs: [] });
    expect(JSON.stringify(onlineOnly)).not.toContain("PostalAddress");
  });

  it("toma horarios y precios de la configuración real y omite FAQPage si no hay preguntas", () => {
    expect(JSON.stringify(graph)).toContain('"dayOfWeek":"Monday"');
    expect(JSON.stringify(graph)).toContain('"opens":"09:00"');
    expect(JSON.stringify(graph)).toContain('"price":150000');
    const none = buildHomeGraph({ baseUrl: base, identity, imageUrl: "x", mode: "online", description: "d", faqs: [] });
    expect((none["@graph"] as Record<string, unknown>[]).some((n) => n["@type"] === "FAQPage")).toBe(false);
  });

  it("las páginas de aterrizaje agregan migas de pan y sus propias preguntas", () => {
    const g = buildLandingGraph({ baseUrl: base, identity, imageUrl: "x", mode: "mixta", path: "/psicologo-encarnacion", name: "Psicólogo en Encarnación", description: "d", faqs });
    const types = (g["@graph"] as Record<string, unknown>[]).map((n) => n["@type"]);
    expect(types).toContain("BreadcrumbList");
    expect(types).toContain("FAQPage");
  });
});

describe("páginas de aterrizaje", () => {
  const ctx = { nombre: "Lic. Matías Sánchez", matricula: "RP 14394-LP", whatsapp: "+595 985 569 077", mode: "online" as const, country: "Paraguay" };
  const words = (p: (typeof landingPages)[number]) =>
    [p.lead, ...p.sections.flatMap((s) => [s.heading, ...(s.paragraphs ?? []), ...(s.bullets ?? [])]), ...p.faqs.flatMap((f) => [f.question, f.answer])].map((t) => fill(t, ctx)).join(" ").split(/\s+/).length;

  it("tienen contenido propio de 600 a 900 palabras y rutas únicas", () => {
    expect(new Set(landingPages.map((p) => p.path)).size).toBe(landingPages.length);
    for (const p of landingPages) {
      expect(words(p), p.slug).toBeGreaterThanOrEqual(600);
      expect(words(p), p.slug).toBeLessThanOrEqual(900);
    }
  });

  it("no dejan marcadores sin completar ni prometen curas o resultados garantizados", () => {
    for (const p of landingPages) {
      const text = [p.lead, p.metaDescription, ...p.sections.flatMap((s) => [...(s.paragraphs ?? []), ...(s.bullets ?? [])]), ...p.faqs.map((f) => f.answer)].map((t) => fill(t, ctx)).join(" ");
      expect(text, p.slug).not.toMatch(/\{\{/);
      expect(text.toLowerCase(), p.slug).not.toMatch(/garantiz|cura definitiva|100 ?% efectiv|el mejor psic/);
      expect(text, p.slug).toContain("911");
      expect(fill(p.metaDescription, ctx).length, p.slug).toBeLessThanOrEqual(160);
      expect(p.metaTitle.length, p.slug).toBeLessThanOrEqual(60);
    }
  });

  it("la frase de atención respeta la modalidad activa", () => {
    expect(attentionSentence("online", "Paraguay")).toContain("videollamada");
    expect(attentionSentence("presencial", "Paraguay")).not.toContain("videollamada");
    expect(attentionSentence("mixta", "Paraguay")).toContain("Encarnación");
  });
});

describe("GEO y rastreo", () => {
  const input = { baseUrl: base, identity, mode: "online" as const, specialties: ["Trastornos de ansiedad"], faqs: [{ question: "¿Q?", answer: "A." }] };

  it("llms.txt resume al profesional con contacto y enlaces a las páginas clave", () => {
    const txt = buildLlmsTxt(input);
    expect(txt.startsWith("# Lic. Matías Sánchez")).toBe(true);
    expect(txt).toContain("+595 985 569 077");
    for (const p of landingPages) expect(txt).toContain(`${base}${p.path}`);
    expect(txt).toContain("911");
  });

  it("llms-full.txt incluye el contenido y las preguntas frecuentes", () => {
    const txt = buildLlmsFullTxt(input);
    expect(txt).toContain("Psicólogo en Encarnación, Paraguay");
    expect(txt).toContain("Trastornos de ansiedad");
    expect(txt).toContain("¿Q?");
    expect(txt).not.toMatch(/\{\{/);
  });

  it("robots permite a los buscadores y asistentes de IA y mantiene privado el panel y el portal", () => {
    const r = robots();
    const rules = Array.isArray(r.rules) ? r.rules : [r.rules];
    const agents = rules.flatMap((x) => (Array.isArray(x.userAgent) ? x.userAgent : [x.userAgent]));
    for (const a of ["Googlebot", "Bingbot", "OAI-SearchBot", "ChatGPT-User", "PerplexityBot", "Google-Extended"]) expect(agents).toContain(a);
    for (const rule of rules) {
      const disallow = ([] as string[]).concat(rule.disallow ?? []);
      if (disallow.includes("/")) continue;
      for (const path of ["/admin", "/app", "/api", "/auth"]) expect(disallow).toContain(path);
    }
    expect(r.sitemap).toContain("/sitemap.xml");
  });

  it("el sitemap lista la home, las páginas de aterrizaje y las legales", () => {
    const urls = sitemap().map((e) => e.url);
    for (const p of landingPages) expect(urls.some((u) => u.endsWith(p.path))).toBe(true);
    expect(urls.some((u) => u.endsWith("/planes"))).toBe(true);
  });
});
