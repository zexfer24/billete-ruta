import { describe, expect, it } from "vitest";
import { upcomingTitle } from "@/app/panel/_forms/upcoming-title";

describe("upcomingTitle", () => {
  it("da la cifra exacta, sin «o más»", () => {
    expect(upcomingTitle(15)).toBe("Tiene 15 salidas asignadas en los próximos 7 días");
    expect(upcomingTitle(3)).toBe("Tiene 3 salidas asignadas en los próximos 7 días");
  });

  it("usa el singular con una sola salida", () => {
    expect(upcomingTitle(1)).toBe("Tiene 1 salida asignada en los próximos 7 días");
  });
});
