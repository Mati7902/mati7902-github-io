import { practiceContact } from "@/lib/config/site";

/** Solo dígitos, con código de país. Acepta "+595 985 569 077", "0985 569 077" o "595985569077". */
export function normalizeWhatsappNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (/^0\d{9}$/.test(digits)) return `595${digits.slice(1)}`;
  return digits;
}

/** "+595 985 569 077" para números de Paraguay; otros números se muestran como "+<dígitos>". */
export function formatWhatsappDisplay(raw: string): string {
  const d = normalizeWhatsappNumber(raw);
  if (/^5959\d{8}$/.test(d)) return `+595 ${d.slice(3, 6)} ${d.slice(6, 9)} ${d.slice(9)}`;
  return `+${d}`;
}

/** WhatsApp público: el de Configuración › Identidad y, si está vacío, el del consultorio. */
export function publicWhatsapp(identity: { whatsapp?: string | null }): { digits: string; display: string; e164: string } {
  const raw = identity.whatsapp?.trim() || practiceContact.whatsapp;
  const digits = normalizeWhatsappNumber(raw);
  return { digits, display: formatWhatsappDisplay(raw), e164: `+${digits}` };
}

export function whatsappLink(identity: { whatsapp?: string | null }, message: string = practiceContact.whatsappMessage): string {
  return `https://wa.me/${publicWhatsapp(identity).digits}?text=${encodeURIComponent(message)}`;
}
