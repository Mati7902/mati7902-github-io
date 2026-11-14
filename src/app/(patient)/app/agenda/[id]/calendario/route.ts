import { NextResponse, type NextRequest } from "next/server";

import { getSession } from "@/lib/auth/session";
import { buildIcs } from "@/lib/calendar";
import { getServerEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Descarga el turno como .ics para agregarlo al calendario del celular. RLS: solo los turnos propios. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const supabase = await createClient();
  const { data: appt } = await supabase.from("appointments").select("id, start_time, end_time, modality, location, status").eq("id", id).maybeSingle();
  if (!appt || !["pending", "confirmed", "rescheduled", "requested"].includes(appt.status)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const ics = buildIcs({
    id: appt.id,
    start: appt.start_time,
    end: appt.end_time,
    location: appt.modality === "virtual" ? "Online (el enlace está en la app)" : appt.location,
    url: `${getServerEnv().NEXT_PUBLIC_APP_URL}/app/agenda`,
  });
  return new NextResponse(ics, {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `attachment; filename="turno.ics"`, "Cache-Control": "private, no-store" },
  });
}
