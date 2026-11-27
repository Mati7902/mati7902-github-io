import { describe, expect, it } from "vitest";

import { localInputToUtcIso, weeklyLocalInputs } from "@/lib/dates";

describe("Plan mensual: 4 sesiones semanales", () => {
  it("repite el mismo día y hora local cada 7 días, cruzando de mes", () => {
    // Jueves 26/11/2026 18:00 en Asunción (UTC-3) = 21:00 UTC.
    const start = localInputToUtcIso("2026-11-26T18:00", "America/Asuncion")!;
    expect(weeklyLocalInputs(start, 4, "America/Asuncion")).toEqual(["2026-11-26T18:00", "2026-12-03T18:00", "2026-12-10T18:00", "2026-12-17T18:00"]);
  });
});
