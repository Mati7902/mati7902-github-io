import { describe, expect, it } from "vitest";

import { buildReminderEmail } from "@/lib/email/reminder";
import { describeRule, directionsUrl, locationLabel, mapEmbedUrl, nextRuleDates } from "@/lib/locations";

const trinidad = { name: "Sanatorio La Trinidad", address: "Avda. Bernardino Caballero 248", city: "Encarnación, Itapúa", maps_url: null };

describe("sedes", () => {
  it("arma etiqueta, mapa y cómo llegar", () => {
    expect(locationLabel(trinidad)).toBe("Sanatorio La Trinidad — Avda. Bernardino Caballero 248, Encarnación, Itapúa");
    expect(directionsUrl(trinidad)).toContain("https://www.google.com/maps/search/?api=1&query=Sanatorio%20La%20Trinidad");
    expect(directionsUrl({ ...trinidad, maps_url: "https://maps.app.goo.gl/abc" })).toBe("https://maps.app.goo.gl/abc");
    expect(mapEmbedUrl(trinidad)).toMatch(/^https:\/\/www\.google\.com\/maps\?q=.+&output=embed$/);
  });

  it("describe la frecuencia y calcula las próximas fechas", () => {
    const rule = { weekday: 2, start_time: "16:00:00", end_time: "20:00:00", every_weeks: 2, anchor_date: "2026-10-27" };
    expect(describeRule(rule)).toBe("Martes de 16:00 a 20:00, cada 15 días");
    expect(describeRule({ ...rule, every_weeks: 1 })).toBe("Martes de 16:00 a 20:00");
    expect(nextRuleDates(rule, "2026-10-23", 3)).toEqual(["2026-10-27", "2026-11-10", "2026-11-24"]);
  });
});

describe("recordatorio por email", () => {
  const base = {
    kind: "reminder_24h" as const,
    firstName: "Ana",
    professionalName: "Lic. Prueba",
    start: "2026-10-27T19:00:00Z",
    timezone: "America/Asuncion",
    appUrl: "https://ejemplo.com/",
  };

  it("presencial: incluye fecha, hora, dirección y cómo llegar", () => {
    const mail = buildReminderEmail({ ...base, modality: "presencial", address: locationLabel(trinidad), videoLink: null });
    expect(mail.subject).toBe("Recordatorio: tu sesión es mañana a las 16:00");
    expect(mail.text).toContain("Sanatorio La Trinidad");
    expect(mail.text).toContain("https://ejemplo.com/app/agenda");
    expect(mail.html).toContain("Cómo llegar");
  });

  it("virtual: incluye el enlace y escapa HTML", () => {
    const mail = buildReminderEmail({ ...base, kind: "reminder_2h", firstName: "<b>Ana</b>", modality: "virtual", address: null, videoLink: "https://meet.example/x" });
    expect(mail.subject).toContain("es hoy");
    expect(mail.html).toContain("&lt;b&gt;Ana&lt;/b&gt;");
    expect(mail.html).not.toContain("<b>Ana</b>");
    expect(mail.text).toContain("https://meet.example/x");
  });
});
