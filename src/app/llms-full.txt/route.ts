import { publicEnv } from "@/lib/env";
import { modalityMode } from "@/lib/modalities";
import { buildLlmsFullTxt } from "@/lib/seo/llms";
import { getPublishedFaqs } from "@/server/services/public-content";
import { getPublicSettingsSafe } from "@/server/services/public-settings";

export const revalidate = 3600;

export async function GET() {
  const [{ "site.identity": identity, landing, scheduling }, faqs] = await Promise.all([getPublicSettingsSafe(), getPublishedFaqs()]);
  const body = buildLlmsFullTxt({ baseUrl: publicEnv.appUrl, identity, mode: modalityMode(scheduling.modalities_enabled), specialties: landing.specialties.map((s) => s.title), faqs });
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600, s-maxage=3600" } });
}
