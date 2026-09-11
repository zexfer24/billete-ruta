import type { ReservationStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { toDecimal, ZERO } from "@/lib/decimal";
import { PAYMENT_STATES, paymentStateFromSlug, paymentStateOf } from "@/modules/reports";

describe("paymentStateOf", () => {
  it("Confirmado para PAGADA o ABORDADA, sin importar lo pagado", () => {
    for (const estado of ["PAGADA", "ABORDADA"] as const) {
      expect(paymentStateOf(estado, ZERO)).toBe("Confirmado");
      expect(paymentStateOf(estado, toDecimal(50))).toBe("Confirmado");
    }
  });

  it("Sin efecto para LIBERADA, CANCELADA o NO_SHOW, sin importar lo pagado", () => {
    for (const estado of ["LIBERADA", "CANCELADA", "NO_SHOW"] as const) {
      expect(paymentStateOf(estado, ZERO)).toBe("Sin efecto");
      expect(paymentStateOf(estado, toDecimal(50))).toBe("Sin efecto");
    }
  });

  it("Pendiente para un estado abierto sin nada pagado", () => {
    for (const estado of [
      "PENDIENTE_PAGO",
      "EN_VALIDACION",
      "ABONADA",
      "PAGO_EN_SITIO",
    ] as const) {
      expect(paymentStateOf(estado, ZERO)).toBe("Pendiente");
    }
  });

  it("Abonado para un estado abierto con algo pagado", () => {
    for (const estado of [
      "PENDIENTE_PAGO",
      "EN_VALIDACION",
      "ABONADA",
      "PAGO_EN_SITIO",
    ] as const) {
      expect(paymentStateOf(estado, toDecimal(10))).toBe("Abonado");
    }
  });

  it("una reserva en validación sin comprobantes aprobados es Pendiente, no Abonado", () => {
    expect(paymentStateOf("EN_VALIDACION", ZERO)).toBe("Pendiente");
  });

  it("un cobro en sitio parcial es Abonado", () => {
    expect(paymentStateOf("PAGO_EN_SITIO", toDecimal(10))).toBe("Abonado");
  });

  it("PAYMENT_STATES enumera las cuatro etiquetas en orden", () => {
    expect(PAYMENT_STATES).toEqual(["Pendiente", "Abonado", "Confirmado", "Sin efecto"]);
  });

  it("cubre los nueve estados de reserva", () => {
    const TODOS: ReservationStatus[] = [
      "PENDIENTE_PAGO",
      "EN_VALIDACION",
      "ABONADA",
      "PAGADA",
      "PAGO_EN_SITIO",
      "LIBERADA",
      "CANCELADA",
      "ABORDADA",
      "NO_SHOW",
    ];
    for (const estado of TODOS) {
      expect(PAYMENT_STATES).toContain(paymentStateOf(estado, ZERO));
    }
  });
});

describe("paymentStateFromSlug", () => {
  it("traduce los cuatro slugs válidos", () => {
    expect(paymentStateFromSlug("pendiente")).toBe("Pendiente");
    expect(paymentStateFromSlug("abonado")).toBe("Abonado");
    expect(paymentStateFromSlug("confirmado")).toBe("Confirmado");
    expect(paymentStateFromSlug("sin-efecto")).toBe("Sin efecto");
  });

  it("devuelve undefined para valores ausentes o inválidos, incluidas claves heredadas de Object.prototype", () => {
    const invalidos = [
      undefined,
      "",
      "ABONADO",
      "constructor",
      "toString",
      "__proto__",
      "hasOwnProperty",
    ] as const;
    for (const slug of invalidos) {
      expect(paymentStateFromSlug(slug)).toBeUndefined();
    }
  });
});
