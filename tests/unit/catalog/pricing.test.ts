import { describe, expect, it } from "vitest";
import { toDecimal } from "@/lib/decimal";
import { balanceUsd, computeAmounts, statusAfterPayment, toUsd } from "@/modules/catalog";

const TARIFA = toDecimal("45.00");
const TASA_SALIDA = toDecimal("2.50");

describe("computeAmounts", () => {
  it("separa tarifa de agencia y tasa de salida del terminal", () => {
    const r = computeAmounts({
      fareUsd: TARIFA,
      taxPerPassengerUsd: TASA_SALIDA,
      passengerCount: 3,
      currency: "USD",
      rateFromUsd: null,
    });
    expect(r.fareTotalUsd.toString()).toBe("135");
    expect(r.taxTotalUsd.toString()).toBe("7.5");
    expect(r.totalUsd.toString()).toBe("142.5");
    expect(r.amountInCurrency.toString()).toBe("142.5");
    expect(r.exchangeRateUsed.toString()).toBe("1");
  });

  it("trata USDT a la par del dólar sin exigir tasa", () => {
    const r = computeAmounts({
      fareUsd: TARIFA,
      taxPerPassengerUsd: TASA_SALIDA,
      passengerCount: 1,
      currency: "USDT",
      rateFromUsd: null,
    });
    expect(r.amountInCurrency.toString()).toBe("47.5");
    expect(r.exchangeRateUsed.toString()).toBe("1");
  });

  it("convierte a bolívares con la tasa vigente", () => {
    const r = computeAmounts({
      fareUsd: TARIFA,
      taxPerPassengerUsd: TASA_SALIDA,
      passengerCount: 3,
      currency: "VES",
      rateFromUsd: toDecimal("36.7412"),
    });
    expect(r.amountInCurrency.toString()).toBe("5235.62");
  });

  it("convierte a pesos colombianos", () => {
    const r = computeAmounts({
      fareUsd: TARIFA,
      taxPerPassengerUsd: TASA_SALIDA,
      passengerCount: 3,
      currency: "COP",
      rateFromUsd: toDecimal("4012.5"),
    });
    expect(r.amountInCurrency.toString()).toBe("571781.25");
  });

  it("exige tasa para monedas distintas del dólar", () => {
    expect(() =>
      computeAmounts({
        fareUsd: TARIFA,
        taxPerPassengerUsd: TASA_SALIDA,
        passengerCount: 1,
        currency: "VES",
        rateFromUsd: null,
      }),
    ).toThrow(/tasa vigente/);
  });

  it("rechaza cantidades fuera de 1 a 6", () => {
    for (const cantidad of [0, 7]) {
      expect(() =>
        computeAmounts({
          fareUsd: TARIFA,
          taxPerPassengerUsd: TASA_SALIDA,
          passengerCount: cantidad,
          currency: "USD",
          rateFromUsd: null,
        }),
      ).toThrow(/entre 1 y 6/);
    }
  });
});

describe("balanceUsd", () => {
  it("calcula el saldo pendiente", () => {
    expect(balanceUsd(toDecimal("142.5"), toDecimal("50")).toString()).toBe("92.5");
  });

  it("nunca devuelve saldo negativo ante un pago en exceso", () => {
    expect(balanceUsd(toDecimal("142.5"), toDecimal("200")).toString()).toBe("0");
  });
});

describe("statusAfterPayment", () => {
  const total = toDecimal("142.5");

  it("deja la reserva abonada cuando queda saldo", () => {
    expect(statusAfterPayment("EN_VALIDACION", total, toDecimal("50"))).toBe("ABONADA");
  });

  it("marca pagada cuando el saldo llega a cero", () => {
    expect(statusAfterPayment("EN_VALIDACION", total, toDecimal("142.5"))).toBe("PAGADA");
  });

  it("marca pagada también con un pago en exceso", () => {
    expect(statusAfterPayment("EN_VALIDACION", total, toDecimal("200"))).toBe("PAGADA");
  });

  it("mantiene el pago en sitio mientras quede saldo", () => {
    expect(statusAfterPayment("PAGO_EN_SITIO", total, toDecimal("40"))).toBe("PAGO_EN_SITIO");
    expect(statusAfterPayment("PAGO_EN_SITIO", total, total)).toBe("PAGADA");
  });
});

describe("toUsd", () => {
  it("convierte un abono en bolívares usando la tasa de la reserva", () => {
    expect(toUsd(toDecimal("1837.06"), "VES", toDecimal("36.7412")).toString()).toBe("50");
  });

  it("deja los montos en dólares tal cual", () => {
    expect(toUsd(toDecimal("50"), "USD", toDecimal("1")).toString()).toBe("50");
  });

  it("rechaza una tasa en cero", () => {
    expect(() => toUsd(toDecimal("50"), "VES", toDecimal("0"))).toThrow(/no puede ser cero/);
  });
});
