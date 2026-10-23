import { capitalize, formatLongDate, formatTime } from "@/lib/dates";

export type ReminderEmailInput = {
  kind: "reminder_24h" | "reminder_2h";
  firstName: string;
  professionalName: string;
  start: string;
  timezone: string;
  modality: "presencial" | "virtual";
  /** "Sanatorio X — Dirección, Ciudad" (o la del consultorio). */
  address: string | null;
  videoLink: string | null;
  appUrl: string;
};

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * Recordatorio de sesión por email (texto y HTML simple, que se ve bien en Gmail y en el celular).
 * Sin datos clínicos: solo fecha, hora, lugar o enlace y cómo confirmar o cambiar el turno.
 */
export function buildReminderEmail(input: ReminderEmailInput): { subject: string; text: string; html: string } {
  const date = capitalize(formatLongDate(input.start, input.timezone));
  const time = formatTime(input.start, input.timezone);
  const when = input.kind === "reminder_24h" ? "mañana" : "en un rato";
  const subject = `Recordatorio: tu sesión ${input.kind === "reminder_24h" ? "es mañana" : "es hoy"} a las ${time}`;
  const agenda = `${input.appUrl.replace(/\/$/, "")}/app/agenda`;
  const maps = input.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(input.address)}` : null;

  const placeText =
    input.modality === "virtual"
      ? input.videoLink
        ? `Videollamada: ${input.videoLink}`
        : "Es por videollamada: te enviamos el enlace antes de la sesión."
      : input.address
        ? `Lugar: ${input.address}\nCómo llegar: ${maps}`
        : "Es presencial, en el consultorio.";

  const text = [
    `Hola, ${input.firstName}:`,
    "",
    `Te recordamos que ${when} tenés sesión con ${input.professionalName}.`,
    "",
    `${date}, ${time} hs (${input.modality})`,
    placeText,
    "",
    `Para confirmar, reprogramar o cancelar: ${agenda}`,
    "",
    "Si no podés asistir, avisanos con tiempo así el horario queda para otra persona.",
  ].join("\n");

  const placeHtml =
    input.modality === "virtual"
      ? input.videoLink
        ? `Videollamada: <a href="${escape(input.videoLink)}">${escape(input.videoLink)}</a>`
        : "Es por videollamada: te enviamos el enlace antes de la sesión."
      : input.address
        ? `${escape(input.address)}<br><a href="${escape(maps!)}">Cómo llegar</a>`
        : "Es presencial, en el consultorio.";

  const html = `<!doctype html><html lang="es"><body style="margin:0;padding:24px;background:#f4f7f6;font-family:Arial,Helvetica,sans-serif;color:#1d2b2a">
<div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;padding:28px">
<p style="margin:0 0 12px">Hola, ${escape(input.firstName)}:</p>
<p style="margin:0 0 20px">Te recordamos que ${when} tenés sesión con ${escape(input.professionalName)}.</p>
<div style="border:1px solid #d9e4e2;border-radius:12px;padding:16px;margin:0 0 20px">
<p style="margin:0 0 6px;font-size:18px;font-weight:bold">${escape(date)}, ${escape(time)} hs</p>
<p style="margin:0 0 6px;color:#4a5c5a">${input.modality === "virtual" ? "Videoconsulta" : "Presencial"}</p>
<p style="margin:0;color:#4a5c5a">${placeHtml}</p>
</div>
<p style="margin:0 0 20px"><a href="${escape(agenda)}" style="display:inline-block;background:#1f5f5b;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px">Confirmar o cambiar el turno</a></p>
<p style="margin:0;font-size:13px;color:#6b7b79">Si no podés asistir, avisanos con tiempo así el horario queda para otra persona.</p>
</div></body></html>`;

  return { subject, text, html };
}
