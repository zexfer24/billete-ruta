import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { computeAmounts } from "@/modules/catalog";
import { formatMoney } from "@/lib/decimal";
import { bookingCost, convertCents, formatCents, parseCents } from "@/app/mi/reservar/money";

describe("parseCents", () => {
  it("lee montos con uno o dos decimales o sin decimales", () => {
    expect(parseCents("12.50")).toBe(BigInt(1250));
    expect(parseCents("12.5")).toBe(BigInt(1250));
    expect(parseCents("12")).toBe(BigInt(1200));
    expect(parseCents("0.01")).toBe(BigInt(1));
  });

  it("acepta ceros de más, pero no decimales reales de más", () => {
    expect(parseCents("12.500")).toBe(BigInt(1250));
    expect(parseCents("12.505")).toBeNull();
  });

  it("rechaza textos que no son montos", () => {
    expect(parseCents("")).toBeNull();
    expect(parseCents("abc")).toBeNull();
    expect(parseCents("-5")).toBeNull();
    expect(parseCents("1e3")).toBeNull();
  });
});

describe("formatCents", () => {
  it("formatea igual que formatMoney en todas las monedas", () => {
    const casos: Array<[string, "USD" | "VES" | "COP" | "USDT"]> = [
      ["0", "USD"],
      ["1234.5", "USD"],
      ["36.5", "VES"],
      ["1234567.89", "COP"],
      ["10", "USDT"],
    ];
    for (const [monto, moneda] of casos) {
      expect(formatCents(parseCents(monto)!, moneda)).toBe(formatMoney(new Prisma.Decimal(monto), moneda));
    }
  });
});

describe("convertCents", () => {
  it("convierte con redondeo del medio hacia arriba", () => {
    // 10,00 $ a 36,555 Bs. por dólar = 365,55 Bs.
    expect(convertCents(BigInt(1000), "36.555")).toBe(BigInt(36555));
    // 0,01 $ a 0,5 = 0,005 → 0,01
    expect(convertCents(BigInt(1), "0.5")).toBe(BigInt(1));
    // 0,01 $ a 0,4 = 0,004 → 0,00
    expect(convertCents(BigInt(1), "0.4")).toBe(BigInt(0));
  });

  it("devuelve null con una tasa inválida", () => {
    expect(convertCents(BigInt(1000), "no")).toBeNull();
  });
});

describe("bookingCost", () => {
  it("coincide con computeAmounts del servidor", () => {
    const casos: Array<[string, string, number, string]> = [
      ["12.50", "1.00", 1, "36.5"],
      ["15.75", "0.50", 3, "4012.123456"],
      ["20", "2.25", 6, "1"],
    ];
    for (const [tarifa, tasa, cantidad, cambio] of casos) {
      const servidor = computeAmounts({
        fareUsd: new Prisma.Decimal(tarifa),
        taxPerPassengerUsd: new Prisma.Decimal(tasa),
        passengerCount: cantidad,
        currency: "VES",
        rateFromUsd: new Prisma.Decimal(cambio),
      });
      const cliente = bookingCost(tarifa, tasa, cantidad);
      expect(formatCents(cliente.fareTotalCents, "USD")).toBe(formatMoney(servidor.fareTotalUsd, "USD"));
      expect(formatCents(cliente.taxTotalCents, "USD")).toBe(formatMoney(servidor.taxTotalUsd, "USD"));
      expect(formatCents(cliente.totalCents, "USD")).toBe(formatMoney(servidor.totalUsd, "USD"));
      expect(formatCents(convertCents(cliente.totalCents, cambio)!, "VES")).toBe(
        formatMoney(servidor.amountInCurrency, "VES"),
      );
    }
  });

  it("un monto inválido cuenta como cero", () => {
    expect(bookingCost("x", "1.00", 2).totalCents).toBe(BigInt(200));
  });
});
