import { seoDefaults } from "@/lib/config/site";
import { publicWhatsapp } from "@/lib/contact";
import type { ModalityMode } from "@/lib/modalities";
import { attentionSentence, fill, landingPages, type LandingContext } from "@/lib/seo/landing-pages";
import type { SeoIdentity } from "@/lib/seo/schema";

type LlmsInput = { baseUrl: string; identity: SeoIdentity; mode: ModalityMode; specialties: string[]; faqs: { question: string; answer: string }[] };

const abs = (base: string, path: string) => new URL(path, base).toString();

function context(input: LlmsInput): LandingContext {
  return {
    nombre: input.identity.professional_name,
    matricula: input.identity.license,
    whatsapp: publicWhatsapp(input.identity).display,
    mode: input.mode,
    country: input.identity.country,
  };
}

/** /llms.txt: resumen breve y factual con enlaces a las páginas clave (formato llmstxt.org). */
export function buildLlmsTxt(input: LlmsInput): string {
  const { baseUrl, identity, mode } = input;
  const wa = publicWhatsapp(identity);
  const lines = [
    `# ${identity.professional_name} — ${identity.professional_title} en ${seoDefaults.city}, ${identity.country}`,
    "",
    `> ${identity.professional_name} es ${identity.professional_title.toLowerCase()} (${identity.license}) con atención en ${seoDefaults.city}, ${seoDefaults.region}, ${identity.country}. ${attentionSentence(mode, identity.country, "third")} Trabaja con terapia cognitivo-conductual, terapia de aceptación y compromiso y habilidades de terapia dialéctico-conductual, con adultos y adolescentes.`,
    "",
    `- Contacto y turnos: WhatsApp ${wa.display} (${`https://wa.me/${wa.digits}`})`,
    ...(identity.email ? [`- Email: ${identity.email}`] : []),
    `- Última revisión del contenido: ${seoDefaults.contentUpdated}`,
    "- Aviso: este sitio no es un servicio de emergencia. En riesgo inmediato, llamar al 911 o acudir a la guardia del hospital más cercano.",
    "",
    "## Páginas clave",
    "",
    `- [Inicio](${abs(baseUrl, "/")}): presentación, áreas de trabajo, modalidades, preguntas frecuentes y cómo pedir turno.`,
    ...landingPages.map((p) => `- [${p.name}](${abs(baseUrl, p.path)}): ${fill(p.metaDescription, context(input))}`),
    `- [Planes de atención](${abs(baseUrl, "/planes")}): planes y precios publicados.`,
    "",
    "## Opcional",
    "",
    `- [Política de privacidad](${abs(baseUrl, "/privacidad")})`,
    `- [Términos de uso](${abs(baseUrl, "/terminos")})`,
    "",
  ];
  return lines.join("\n");
}

/** /llms-full.txt: el contenido de las páginas de aterrizaje y las preguntas frecuentes en texto plano. */
export function buildLlmsFullTxt(input: LlmsInput): string {
  const ctx = context(input);
  const { baseUrl, identity } = input;
  const out: string[] = [buildLlmsTxt(input).trimEnd(), ""];
  if (input.specialties.length) {
    out.push("## Áreas de trabajo", "", ...input.specialties.map((s) => `- ${s}`), "");
  }
  for (const page of landingPages) {
    out.push(`## ${page.h1}`, `Fuente: ${abs(baseUrl, page.path)}`, "", fill(page.lead, ctx), "");
    for (const section of page.sections) {
      out.push(`### ${section.heading}`, "");
      for (const paragraph of section.paragraphs ?? []) out.push(fill(paragraph, ctx), "");
      for (const bullet of section.bullets ?? []) out.push(`- ${fill(bullet, ctx)}`);
      if (section.bullets?.length) out.push("");
    }
    out.push("### Preguntas frecuentes", "");
    for (const faq of page.faqs) out.push(`**${fill(faq.question, ctx)}**`, fill(faq.answer, ctx), "");
  }
  if (input.faqs.length) {
    out.push(`## Preguntas frecuentes de ${identity.professional_name}`, "");
    for (const faq of input.faqs) out.push(`**${faq.question}**`, faq.answer, "");
  }
  return out.join("\n");
}
