import { describe, expect, it } from "vitest";

import { buildIcs, googleCalendarUrl } from "@/lib/calendar";

const ev = { id: "abc", start: "2026-11-20T13:00:00Z", end: "2026-11-20T14:00:00Z", location: "Sanatorio, consultorio 3", url: "https://ejemplo.com/app/agenda" };

describe("Agregar a mi calendario", () => {
  it("arma un .ics válido con título neutro y aviso una hora antes", () => {
    const ics = buildIcs(ev, new Date("2026-11-15T00:00:00Z"));
    expect(ics).toContain("DTSTART:20261120T130000Z");
    expect(ics).toContain("DTEND:20261120T140000Z");
    expect(ics).toContain("SUMMARY:Turno\r\n");
    expect(ics).toContain("LOCATION:Sanatorio\\, consultorio 3");
    expect(ics).toContain("TRIGGER:-PT1H");
    expect(ics).not.toMatch(/SUMMARY:.*(psic|terapia)/i);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });

  it("arma el enlace de Google Calendar", () => {
    const url = new URL(googleCalendarUrl(ev));
    expect(url.searchParams.get("dates")).toBe("20261120T130000Z/20261120T140000Z");
    expect(url.searchParams.get("text")).toBe("Turno");
  });
});
