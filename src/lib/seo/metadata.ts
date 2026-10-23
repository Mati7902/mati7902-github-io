import type { Metadata } from "next";

import type { ModalityMode } from "@/lib/modalities";

/** Texto de modalidad para títulos y descripciones, según lo que esté activo en Configuración › Agenda. */
export function modalityPhrase(mode: ModalityMode): string {
  if (mode === "online") return "online";
  if (mode === "presencial") return "presencial";
  return "presencial y online";
}

export function homeTitle(professionalName: string): string {
  return `Psicólogo en Encarnación, Paraguay | ${professionalName}`;
}

export function homeDescription(license: string, mode: ModalityMode): string {
  return `Psicólogo en Encarnación, Paraguay (${license}). Terapia para adultos y adolescentes, ${modalityPhrase(mode)}. Pedí tu primer turno por WhatsApp.`;
}

type PageMeta = {
  title: string;
  description: string;
  /** Ruta absoluta dentro del sitio, p. ej. "/planes". */
  path: string;
  /** Si es true, el título no lleva el sufijo de la plataforma. */
  absoluteTitle?: boolean;
};

/**
 * Metadatos completos de una página pública. Next reemplaza `openGraph` entero cuando una página lo define,
 * por eso se repiten aquí la imagen y el idioma: cada página queda con canonical, Open Graph y Twitter Card coherentes.
 */
export function pageMetadata({ title, description, path, absoluteTitle = false }: PageMeta): Metadata {
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path, languages: { "es-PY": path } },
    openGraph: {
      type: "website",
      locale: "es_PY",
      url: path,
      title,
      description,
      images: [{ url: "/og.png", width: 1200, height: 630, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description, images: ["/og.png"] },
  };
}
