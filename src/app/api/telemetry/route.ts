import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { pathTemplate } from "@/lib/telemetry";
import { createAdminClient } from "@/lib/supabase/admin";
import { allowAttempt } from "@/server/services/rate-limit";

export const runtime = "nodejs";

const schema = z.object({
  kind: z.enum(["LCP", "INP", "CLS", "FCP", "TTFB", "error"]),
  value: z.number().min(0).max(120_000),
  path: z.string().max(300),
  device: z.enum(["mobile", "desktop"]),
});

/**
 * Recibe métricas de rendimiento y avisos de error de pantalla. No guarda usuario, IP ni texto
 * del error: solo qué tipo de página y cuánto tardó. La IP se usa únicamente para limitar abuso.
 */
export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!(await allowAttempt(`telemetry:${ip}`, 60, 600))) return new NextResponse(null, { status: 204 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return new NextResponse(null, { status: 204 });
  const { kind, value, path, device } = parsed.data;
  await createAdminClient().from("tech_events").insert({ kind, value, path: pathTemplate(path), device });
  return new NextResponse(null, { status: 204 });
}
