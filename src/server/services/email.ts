import "server-only";

import { getServerEnv } from "@/lib/env";
import { createLogger } from "@/lib/logger";

const log = createLogger("email");

export function isEmailConfigured(): boolean {
  return Boolean(getServerEnv().RESEND_API_KEY);
}

/** Remitente: EMAIL_FROM o turnos@<dominio del sitio> (el dominio tiene que estar verificado en Resend). */
export function defaultSender(professionalName: string): string {
  const env = getServerEnv();
  if (env.EMAIL_FROM) return env.EMAIL_FROM;
  const host = new URL(env.NEXT_PUBLIC_APP_URL).hostname.replace(/^www\./, "");
  return `${professionalName.replace(/[<>"]/g, "")} <turnos@${host}>`;
}

export type EmailResult = { ok: true; id: string | null } | { ok: false; error: string };

/**
 * Envía un email por la API de Resend. La clave de idempotencia evita duplicados si el cron
 * reintenta el mismo recordatorio.
 */
export async function sendEmail(input: { to: string; from: string; subject: string; text: string; html: string; idempotencyKey?: string }): Promise<EmailResult> {
  const key = getServerEnv().RESEND_API_KEY;
  if (!key) return { ok: false, error: "Email no configurado (falta RESEND_API_KEY)." };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        ...(input.idempotencyKey ? { "Idempotency-Key": input.idempotencyKey } : {}),
      },
      body: JSON.stringify({ from: input.from, to: [input.to], subject: input.subject, text: input.text, html: input.html }),
      signal: AbortSignal.timeout(15_000),
    });
    const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!res.ok) {
      log.warn("Resend rechazó el email", { status: res.status, message: body.message });
      return { ok: false, error: body.message ?? `HTTP ${res.status}` };
    }
    return { ok: true, id: body.id ?? null };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Error de red" };
  }
}
