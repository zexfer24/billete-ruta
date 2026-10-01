import { describe, expect, it } from "vitest";
import { round2, toDecimal } from "@/lib/decimal";
import { cashEquivalents, cashRateFor } from "@/app/panel/_forms/cash-equivalents";

const TASAS = { VES: toDecimal("40"), COP: toDecimal("4000") };

describe("cashRateFor", () => {
  it("en la moneda de la reserva usa la tasa congelada; en otra moneda local, la vigente", () => {
    const reserva = { currency: "VES" as const, exchangeRateUsed: toDecimal("36.5") };
    expect(cashRateFor("VES", reserva, TASAS)).toEqual({ rate: toDecimal("36.5"), frozen: true });
    expect(cashRateFor("COP", reserva, TASAS)).toEqual({ rate: toDecimal("4000"), frozen: false });
  });

  it("dólares y USDT van uno a uno, sin tasa", () => {
    const reserva = { currency: "USD" as const, exchangeRateUsed: toDecimal("1") };
    expect(cashRateFor("USD", reserva, TASAS)).toBeNull();
    expect(cashRateFor("USDT", reserva, TASAS)).toBeNull();
  });

  it("sin tasa vigente cargada no hay tasa", () => {
    const reserva = { currency: "USD" as const, exchangeRateUsed: toDecimal("1") };
    expect(cashRateFor("COP", reserva, { VES: TASAS.VES, COP: null })).toBeNull();
  });
});

describe("cashEquivalents", () => {
  it("da lo que falta en cada moneda con su tasa legible", () => {
    const equivalentes = cashEquivalents({
      balanceUsd: toDecimal("246"),
      reservation: { currency: "VES", exchangeRateUsed: toDecimal("36.5") },
      currentRates: TASAS,
    });
    expect(equivalentes.map((e) => [e.currency, e.balanceCents, e.frozenRate])).toEqual([
      ["USD", 24600, false],
      ["VES", 897900, true],
      ["COP", 98400000, false],
      ["USDT", 24600, false],
    ]);
    expect(equivalentes[1]?.rateLabel).toBe("1 US$ = Bs.\u00A036,50");
  });

  it("una moneda sin tasa vigente queda sin monto, para no ofrecerla", () => {
    const equivalentes = cashEquivalents({
      balanceUsd: toDecimal("10"),
      reservation: { currency: "USD", exchangeRateUsed: toDecimal("1") },
      currentRates: { VES: TASAS.VES, COP: null },
    });
    expect(equivalentes.find((e) => e.currency === "COP")?.balanceCents).toBeNull();
  });

  it("redondea hacia arriba: el monto local, pasado a dólares como en el servidor, nunca queda por debajo del saldo", () => {
    for (const [saldo, tasa] of [
      ["246.01", "36.4999"],
      ["47.5", "36.123457"],
      ["0.01", "41.7"],
      ["123.45", "3987.654321"],
    ] as const) {
      const [, ves] = cashEquivalents({
        balanceUsd: toDecimal(saldo),
        reservation: { currency: "VES", exchangeRateUsed: toDecimal(tasa) },
        currentRates: TASAS,
      });
      const local = toDecimal(ves?.balanceCents ?? 0).div(100);
      expect(round2(local.div(toDecimal(tasa))).toFixed(2)).toBe(toDecimal(saldo).toFixed(2));
    }
  });
});
