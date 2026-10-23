import type { MetadataRoute } from "next";

import { publicEnv } from "@/lib/env";

/**
 * Decisión del profesional: ¿bloquear los rastreadores que usan el contenido para ENTRENAR modelos de IA?
 * Bloquearlos NO afecta a Google ni a que ChatGPT, Perplexity o Gemini citen el sitio en sus respuestas (eso lo hacen
 * los rastreadores de búsqueda de la lista de abajo). Por defecto se permiten, para maximizar la presencia.
 */
const BLOCK_AI_TRAINING_CRAWLERS = false;
const TRAINING_CRAWLERS = ["GPTBot", "CCBot"];

/** Rastreadores de búsqueda y de asistentes de IA que deben poder leer lo público. */
const SEARCH_AND_ASSISTANT_CRAWLERS = [
  "Googlebot",
  "Bingbot",
  "Google-Extended",
  "OAI-SearchBot",
  "ChatGPT-User",
  "PerplexityBot",
  "Perplexity-User",
  "Claude-SearchBot",
  "Claude-User",
];

const PUBLIC_PATHS = ["/", "/planes", "/privacidad", "/terminos", "/psicologo-encarnacion", "/terapia-psicologica-online-paraguay", "/psicologo-adolescentes-encarnacion", "/llms.txt", "/llms-full.txt"];
const PRIVATE_PATHS = ["/app", "/admin", "/api", "/auth", "/login", "/recuperar", "/restablecer", "/bienvenida", "/consentimiento", "/sin-ficha", "/offline"];

export default function robots(): MetadataRoute.Robots {
  const rules: MetadataRoute.Robots["rules"] = [
    // Un rastreador con regla propia ignora la de "*": por eso cada grupo repite sus rutas privadas.
    { userAgent: SEARCH_AND_ASSISTANT_CRAWLERS, allow: PUBLIC_PATHS, disallow: PRIVATE_PATHS },
    { userAgent: "*", allow: PUBLIC_PATHS, disallow: PRIVATE_PATHS },
  ];
  if (BLOCK_AI_TRAINING_CRAWLERS) rules.push({ userAgent: TRAINING_CRAWLERS, disallow: "/" });
  return { rules, sitemap: `${publicEnv.appUrl}/sitemap.xml` };
}
