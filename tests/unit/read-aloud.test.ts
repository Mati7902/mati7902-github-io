import { describe, expect, it } from "vitest";

import { plainForSpeech } from "@/components/a11y/read-aloud";

describe("Escuchar en voz alta", () => {
  it("quita negritas, viñetas y títulos", () => {
    expect(plainForSpeech("## Título\n\nUn **dato** importante.\n\n- primero\n- segundo")).toBe("Título. Un dato importante. primero segundo");
  });
});
