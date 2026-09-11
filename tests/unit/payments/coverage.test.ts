import { describe, expect, it } from "vitest";
import { toDecimal } from "@/lib/decimal";
import { proofCoverage } from "@/modules/payments";

describe("proofCoverage", () => {
  it("clasifica un abono parcial", () => {
    const r = proofCoverage(toDecimal("95"), toDecimal("0"), toDecimal("50"));
    expect(r.kind).toBe("ABONO_PARCIAL");
    expect(r.balanceBeforeUsd.toString()).toBe("95");
    expect(r.balanceAfterUsd.toString()).toBe("45");
    expect(r.excessUsd.toString()).toBe("0");
  });

  it("clasifica un pago que completa el saldo exacto", () => {
    const r = proofCoverage(toDecimal("95"), toDecimal("50"), toDecimal("45"));
    expect(r.kind).toBe("PAGO_COMPLETO");
    expect(r.balanceBeforeUsd.toString()).toBe("45");
    expect(r.balanceAfterUsd.toString()).toBe("0");
    expect(r.excessUsd.toString()).toBe("0");
  });

  it("clasifica un pago que excede el saldo pendiente", () => {
    const r = proofCoverage(toDecimal("95"), toDecimal("50"), toDecimal("60"));
    expect(r.kind).toBe("EXCEDE_SALDO");
    expect(r.balanceBeforeUsd.toString()).toBe("45");
    expect(r.balanceAfterUsd.toString()).toBe("0");
    expect(r.excessUsd.toString()).toBe("15");
  });

  it("una reserva ya saldada deja cualquier comprobante como excedente completo", () => {
    const r = proofCoverage(toDecimal("95"), toDecimal("95"), toDecimal("10"));
    expect(r.kind).toBe("EXCEDE_SALDO");
    expect(r.balanceBeforeUsd.toString()).toBe("0");
    expect(r.balanceAfterUsd.toString()).toBe("0");
    expect(r.excessUsd.toString()).toBe("10");
  });
});
