import { describe, expect, it } from "vitest";
import { formatUsdString } from "@/lib/decimal";

describe("formatUsdString", () => {
  it("formatea un entero con coma decimal y dos ceros", () => {
    expect(formatUsdString("95")).toBe("$ 95,00");
  });

  it("formatea con separador de miles y coma decimal", () => {
    expect(formatUsdString("1234.5")).toBe("$ 1.234,50");
  });

  it("redondea a dos decimales", () => {
    expect(formatUsdString("10.005")).toBe("$ 10,01");
  });

  it("formatea cero", () => {
    expect(formatUsdString("0")).toBe("$ 0,00");
  });
});
