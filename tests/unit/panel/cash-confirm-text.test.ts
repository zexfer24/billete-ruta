import { describe, expect, it } from "vitest";
import { amountToCents, cashConfirmText, centsToInput, decimalToCents, formatCents } from "@/app/panel/_forms/cash-confirm-text";

describe("amountToCents", () => {
  it("acepta coma o punto y hasta dos decimales", () => {
    expect(amountToCents("41")).toBe(4100);
    expect(amountToCents("41,5")).toBe(4150);
    expect(amountToCents(" 41.05 ")).toBe(4105);
  });

  it("rechaza cero, negativos, texto y más de dos decimales", () => {
    expect(amountToCents("0")).toBeNull();
    expect(amountToCents("-5")).toBeNull();
    expect(amountToCents("doce")).toBeNull();
    expect(amountToCents("12,505")).toBeNull();
  });

  it("decimalToCents acepta el saldo en cero", () => {
    expect(decimalToCents("0")).toBe(0);
    expect(decimalToCents("47.5")).toBe(4750);
  });
});

describe("formatCents", () => {
  it("usa separador de miles y coma decimal", () => {
    expect(formatCents(104150, "USD")).toBe("$ 1.041,50");
    expect(formatCents(3600, "VES")).toBe("Bs. 36,00");
  });
});

describe("cashConfirmText", () => {
  it("nombra al titular y dice el saldo que queda", () => {
    const texto = cashConfirmText({ amountCents: 2000, currency: "USD", balanceCents: 4100, holderName: "Joel Yépez" });
    expect(texto.lead).toBe(
      "Registrarás $ 20,00 en efectivo a nombre de Joel Yépez. Un cobro registrado no se puede borrar.",
    );
    expect(texto.outcome).toBe("Quedará un saldo de $ 21,00 por cobrar.");
    expect(texto.excess).toBeNull();
  });

  it("con el saldo completo avisa que se emite el ticket", () => {
    const texto = cashConfirmText({ amountCents: 4100, currency: "USDT", balanceCents: 4100 });
    expect(texto.lead).toBe("Registrarás USDT 41,00 en efectivo. Un cobro registrado no se puede borrar.");
    expect(texto.outcome).toBe("La reserva quedará pagada y se emitirá el ticket.");
    expect(texto.excess).toBeNull();
  });

  it("advierte cuando el monto supera el saldo", () => {
    const texto = cashConfirmText({ amountCents: 41000, currency: "USD", balanceCents: 4100 });
    expect(texto.excess).toBe("Supera lo que falta por cobrar en $ 369,00. El excedente también quedará registrado.");
  });

  it("en bolívares o pesos no inventa el saldo resultante", () => {
    const texto = cashConfirmText({ amountCents: 150000, currency: "VES", balanceCents: 4100 });
    expect(texto.outcome).toBe(
      "Se convierte a dólares con la tasa que corresponde y se descuenta de lo que falta por cobrar, $ 41,00.",
    );
    expect(texto.excess).toBeNull();
  });

  const LOCAL = { balanceCents: 897900, rateFromUsd: 36.5, rateLabel: "1 US$ = Bs. 36,50" };

  it("en bolívares con la tasa da el saldo que queda en bolívares", () => {
    const texto = cashConfirmText({ amountCents: 365000, currency: "VES", balanceCents: 24600, local: LOCAL });
    expect(texto.outcome).toBe("Con la tasa de 1 US$ = Bs. 36,50, quedará un saldo de Bs. 5.329,00 por cobrar.");
    expect(texto.excess).toBeNull();
  });

  it("en bolívares con el saldo exacto avisa que se emite el ticket", () => {
    const texto = cashConfirmText({ amountCents: 897900, currency: "VES", balanceCents: 24600, local: LOCAL });
    expect(texto.outcome).toBe("Con la tasa de 1 US$ = Bs. 36,50, la reserva quedará pagada y se emitirá el ticket.");
    expect(texto.excess).toBeNull();
  });

  it("en bolívares advierte el excedente en bolívares", () => {
    const texto = cashConfirmText({ amountCents: 1000000, currency: "VES", balanceCents: 24600, local: LOCAL });
    expect(texto.excess).toBe("Supera lo que falta por cobrar en Bs. 1.021,00. El excedente también quedará registrado.");
  });
});

describe("centsToInput", () => {
  it("escribe el monto con coma decimal y sin separador de miles", () => {
    expect(centsToInput(897900)).toBe("8979,00");
    expect(centsToInput(4105)).toBe("41,05");
    expect(amountToCents(centsToInput(98400000))).toBe(98400000);
  });
});
