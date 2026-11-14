import { describe, expect, it } from "vitest";

import { localClock, nudgeDue, nudgeMessage, type ReminderPrefs } from "@/lib/push/nudges";

const TZ = "America/Asuncion";
const prefs = (over: Partial<ReminderPrefs> = {}): ReminderPrefs => ({ mood: true, habits: false, workbook: false, hour: 20, days: [1, 2, 3, 4, 5, 6, 7], last_sent_on: null, ...over });

describe("Recordatorios suaves", () => {
  it("lee la hora y el día en Asunción", () => {
    // 23:30 UTC del jueves 12 = 20:30 del jueves en Asunción (UTC-3).
    expect(localClock(new Date("2026-11-12T23:30:00Z"), TZ)).toEqual({ hour: 20, weekday: 4, day: "2026-11-12" });
  });

  it("sale a la hora elegida, en los días elegidos y una sola vez por día", () => {
    const clock = { hour: 20, weekday: 4, day: "2026-11-12" };
    expect(nudgeDue(prefs(), clock)).toBe(true);
    expect(nudgeDue(prefs({ hour: 9 }), clock)).toBe(false);
    expect(nudgeDue(prefs({ days: [1, 2] }), clock)).toBe(false);
    expect(nudgeDue(prefs({ last_sent_on: "2026-11-12" }), clock)).toBe(false);
    expect(nudgeDue(prefs({ mood: false }), clock)).toBe(false);
  });

  it("no recuerda lo que ya hizo hoy y el tono es de invitación", () => {
    const p = prefs({ habits: true, workbook: true });
    expect(nudgeMessage(p, { moodToday: true, habitToday: true, hasWorkbook: false })).toBeNull();
    const m = nudgeMessage(p, { moodToday: false, habitToday: false, hasWorkbook: true })!;
    expect(m.body).toBe("Si te queda bien, podés registrar cómo estás, marcar tus hábitos o seguir con tu cuadernillo. Lleva un minuto.");
    expect(m.url).toBe("/app");
    expect(nudgeMessage(p, { moodToday: true, habitToday: false, hasWorkbook: false })!.url).toBe("/app/habitos");
  });
});
