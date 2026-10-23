import type { MetadataRoute } from "next";

import { seoDefaults } from "@/lib/config/site";
import { publicEnv } from "@/lib/env";
import { landingPages } from "@/lib/seo/landing-pages";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = publicEnv.appUrl;
  const updated = new Date(seoDefaults.contentUpdated);
  return [
    { url: `${base}/`, lastModified: updated, changeFrequency: "monthly", priority: 1 },
    ...landingPages.map((p) => ({ url: `${base}${p.path}`, lastModified: updated, changeFrequency: "monthly" as const, priority: 0.9 })),
    { url: `${base}/planes`, lastModified: updated, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/privacidad`, lastModified: updated, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/terminos`, lastModified: updated, changeFrequency: "yearly", priority: 0.3 },
  ];
}
