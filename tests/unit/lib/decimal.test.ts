import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { formatMoney, formatUsdString } from "@/lib/decimal";

describe("formatUsdString", () => {
  it("formatea un entero con coma decimal y dos ceros", () => {
    expect(formatUsdString("95")).toBe("$\u00A095,00");
  });

  it("formatea con separador de miles y coma decimal", () => {
    expect(formatUsdString("1234.5")).toBe("$\u00A01.234,50");
  });

  it("redondea a dos decimales", () => {
    expect(formatUsdString("10.005")).toBe("$\u00A010,01");
  });

  it("formatea cero", () => {
    expect(formatUsdString("0")).toBe("$\u00A00,00");
  });
});

describe("formatMoney", () => {
  it("pega el prefijo de cada moneda a la cifra con un espacio de no separación", () => {
    expect(formatMoney(new Prisma.Decimal("1234.5"), "USD")).toBe("$\u00A01.234,50");
    expect(formatMoney(new Prisma.Decimal("36.5"), "VES")).toBe("Bs.\u00A036,50");
    expect(formatMoney(new Prisma.Decimal("1234567.89"), "COP")).toBe("COP\u00A01.234.567,89");
    expect(formatMoney(new Prisma.Decimal("10"), "USDT")).toBe("USDT\u00A010,00");
  });

  it("no deja ningún espacio normal que permita partir el monto", () => {
    expect(formatMoney(new Prisma.Decimal("0"), "USD")).not.toContain(" ");
    expect(formatUsdString("95")).not.toContain(" ");
  });
});
