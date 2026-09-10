import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { ForbiddenError } from "@/modules/auth";
import { NotOwnerError, createReservation, getAvailability } from "@/modules/booking";
import {
  approveProof,
  registerCashPayment,
  rejectProof,
  submitProof,
} from "@/modules/payments";
import {
  createAccountFixture,
  createAgencyFixture,
  createDepartureFixture,
  createPanelUserFixture,
  createPaymentMethodFixture,
  seedRatesFixture,
} from "../fixtures";
import { disconnect, resetDatabase } from "../setup";

beforeEach(async () => {
  await resetDatabase();
  await seedRatesFixture();
});
afterAll(disconnect);

/** Reserva de 3 pasajeros: 45×3 de tarifa + 2,50×3 de tasa = 142,50 USD. */
async function escenario(currency: "USD" | "VES" = "USD") {
  const { salida, agencia } = await createDepartureFixture({ capacity: 20 });
  const metodo = await createPaymentMethodFixture({ kind: "DIGITAL", currency });
  const cuenta = await createAccountFixture();
  const operador = await createPanelUserFixture({ agencyId: agencia.id });

  const reserva = await createReservation({
    accountId: cuenta.id,
    departureId: salida.id,
    paymentMethodId: metodo.id,
    companions: [
      { fullName: "Uno", idNumber: "V11111111", birthYear: 1990 },
      { fullName: "Dos", idNumber: "V22222222", birthYear: 1990 },
    ],
    policiesAccepted: true,
  });

  return { salida, agencia, metodo, cuenta, operador, reserva };
}

describe("abonos parciales", () => {
  it("el total incluye tarifa y tasa de salida", async () => {
    const { reserva } = await escenario();
    expect(reserva.totalUsd).toBe("142.5");
  });

  it("un comprobante deja la reserva en validación sin sumar todavía", async () => {
    const { reserva, cuenta, metodo } = await escenario();

    await submitProof({
      reservationId: reserva.reservationId,
      accountId: cuenta.id,
      paymentMethodId: metodo.id,
      reference: "REF-00050",
      amount: "50.00",
      currency: "USD",
      imagePath: "comprobantes/x/a.png",
    });

    const fila = await prisma.reservation.findUniqueOrThrow({
      where: { id: reserva.reservationId },
    });
    expect(fila.status).toBe("EN_VALIDACION");
    expect(fila.paidUsd.toString()).toBe("0");
  });

  it("aprobar un abono parcial deja la reserva abonada y avisa el saldo", async () => {
    const { reserva, cuenta, metodo, operador, agencia } = await escenario();

    const { proofId } = await submitProof({
      reservationId: reserva.reservationId,
      accountId: cuenta.id,
      paymentMethodId: metodo.id,
      reference: "REF-00050",
      amount: "50.00",
      currency: "USD",
      imagePath: "comprobantes/x/a.png",
    });

    const resultado = await approveProof({
      proofId,
      panelUserId: operador.id,
      agencyId: agencia.id,
    });

    expect(resultado.shouldIssueTicket).toBe(false);
    const fila = await prisma.reservation.findUniqueOrThrow({
      where: { id: reserva.reservationId },
      include: { messages: true },
    });
    expect(fila.status).toBe("ABONADA");
    expect(fila.paidUsd.toString()).toBe("50");
    expect(fila.messages.some((m) => m.templateKey === "abono_registrado")).toBe(true);
  });

  it("el segundo abono completa el saldo y habilita el ticket", async () => {
    const { reserva, cuenta, metodo, operador, agencia } = await escenario();

    const primero = await submitProof({
      reservationId: reserva.reservationId,
      accountId: cuenta.id,
      paymentMethodId: metodo.id,
      reference: "REF-00050",
      amount: "50.00",
      currency: "USD",
      imagePath: "comprobantes/x/a.png",
    });
    await approveProof({ proofId: primero.proofId, panelUserId: operador.id, agencyId: agencia.id });

    const segundo = await submitProof({
      reservationId: reserva.reservationId,
      accountId: cuenta.id,
      paymentMethodId: metodo.id,
      reference: "REF-00092",
      amount: "92.50",
      currency: "USD",
      imagePath: "comprobantes/x/b.png",
    });
    const resultado = await approveProof({
      proofId: segundo.proofId,
      panelUserId: operador.id,
      agencyId: agencia.id,
    });

    expect(resultado.shouldIssueTicket).toBe(true);
    const fila = await prisma.reservation.findUniqueOrThrow({
      where: { id: reserva.reservationId },
      include: { messages: true },
    });
    expect(fila.status).toBe("PAGADA");
    expect(fila.paidUsd.toString()).toBe("142.5");
    expect(fila.paidAt).not.toBeNull();
    expect(fila.messages.some((m) => m.templateKey === "ticket_emitido")).toBe(true);
  });

  it("convierte un abono en bolívares usando la tasa congelada", async () => {
    const { reserva, cuenta, metodo, operador, agencia } = await escenario("VES");

    // 50 USD × 36,7412 = 1837,06 Bs
    const { proofId } = await submitProof({
      reservationId: reserva.reservationId,
      accountId: cuenta.id,
      paymentMethodId: metodo.id,
      reference: "REF-BS-1",
      amount: "1837.06",
      currency: "VES",
      imagePath: "comprobantes/x/a.png",
    });
    await approveProof({ proofId, panelUserId: operador.id, agencyId: agencia.id });

    const fila = await prisma.reservation.findUniqueOrThrow({
      where: { id: reserva.reservationId },
    });
    expect(fila.paidUsd.toString()).toBe("50");
  });

  it("rechazar el primer comprobante devuelve la reserva a pendiente de pago", async () => {
    const { reserva, cuenta, metodo, operador, agencia } = await escenario();

    const { proofId } = await submitProof({
      reservationId: reserva.reservationId,
      accountId: cuenta.id,
      paymentMethodId: metodo.id,
      reference: "REF-MALA",
      amount: "50.00",
      currency: "USD",
      imagePath: "comprobantes/x/a.png",
    });
    await rejectProof({
      proofId,
      panelUserId: operador.id,
      agencyId: agencia.id,
      reason: "El monto no coincide",
    });

    const fila = await prisma.reservation.findUniqueOrThrow({
      where: { id: reserva.reservationId },
      include: { messages: true, proofs: true },
    });
    expect(fila.status).toBe("PENDIENTE_PAGO");
    expect(fila.proofs[0]?.rejectionReason).toBe("El monto no coincide");
    expect(fila.messages.some((m) => m.templateKey === "pago_rechazado")).toBe(true);
  });

  it("rechazar cuando ya hay un abono devuelve la reserva a abonada", async () => {
    const { reserva, cuenta, metodo, operador, agencia } = await escenario();

    const primero = await submitProof({
      reservationId: reserva.reservationId,
      accountId: cuenta.id,
      paymentMethodId: metodo.id,
      reference: "REF-00050",
      amount: "50.00",
      currency: "USD",
      imagePath: "comprobantes/x/a.png",
    });
    await approveProof({ proofId: primero.proofId, panelUserId: operador.id, agencyId: agencia.id });

    const segundo = await submitProof({
      reservationId: reserva.reservationId,
      accountId: cuenta.id,
      paymentMethodId: metodo.id,
      reference: "REF-MALA",
      amount: "92.50",
      currency: "USD",
      imagePath: "comprobantes/x/b.png",
    });
    await rejectProof({
      proofId: segundo.proofId,
      panelUserId: operador.id,
      agencyId: agencia.id,
      reason: "Comprobante ilegible",
    });

    const fila = await prisma.reservation.findUniqueOrThrow({
      where: { id: reserva.reservationId },
    });
    expect(fila.status).toBe("ABONADA");
    expect(fila.paidUsd.toString()).toBe("50");
  });

  it("aprobar dos veces el mismo comprobante no duplica el abono", async () => {
    const { reserva, cuenta, metodo, operador, agencia } = await escenario();

    const { proofId } = await submitProof({
      reservationId: reserva.reservationId,
      accountId: cuenta.id,
      paymentMethodId: metodo.id,
      reference: "REF-00050",
      amount: "50.00",
      currency: "USD",
      imagePath: "comprobantes/x/a.png",
    });
    await approveProof({ proofId, panelUserId: operador.id, agencyId: agencia.id });
    await approveProof({ proofId, panelUserId: operador.id, agencyId: agencia.id });

    const fila = await prisma.reservation.findUniqueOrThrow({
      where: { id: reserva.reservationId },
    });
    expect(fila.paidUsd.toString()).toBe("50");
  });

  it("un pago mayor al total deja la reserva pagada y registra el excedente", async () => {
    const { reserva, cuenta, metodo, operador, agencia } = await escenario();

    const { proofId } = await submitProof({
      reservationId: reserva.reservationId,
      accountId: cuenta.id,
      paymentMethodId: metodo.id,
      reference: "REF-EXCESO",
      amount: "200.00",
      currency: "USD",
      imagePath: "comprobantes/x/a.png",
    });
    await approveProof({ proofId, panelUserId: operador.id, agencyId: agencia.id });

    const fila = await prisma.reservation.findUniqueOrThrow({
      where: { id: reserva.reservationId },
    });
    expect(fila.status).toBe("PAGADA");

    const excedente = await prisma.auditLog.findFirst({
      where: { entityId: reserva.reservationId, action: "PAGO_EN_EXCESO" },
    });
    expect(excedente).not.toBeNull();
  });

  it("un operador de otra agencia no puede aprobar el comprobante", async () => {
    const { reserva, cuenta, metodo } = await escenario();
    const otraAgencia = await createAgencyFixture();
    const intruso = await createPanelUserFixture({ agencyId: otraAgencia.id });

    const { proofId } = await submitProof({
      reservationId: reserva.reservationId,
      accountId: cuenta.id,
      paymentMethodId: metodo.id,
      reference: "REF-00050",
      amount: "50.00",
      currency: "USD",
      imagePath: "comprobantes/x/a.png",
    });

    await expect(
      approveProof({ proofId, panelUserId: intruso.id, agencyId: otraAgencia.id }),
    ).rejects.toThrow(ForbiddenError);
  });

  it("nadie puede cargar un comprobante en la reserva de otra cuenta", async () => {
    const { reserva, metodo } = await escenario();
    const intrusa = await createAccountFixture();

    await expect(
      submitProof({
        reservationId: reserva.reservationId,
        accountId: intrusa.id,
        paymentMethodId: metodo.id,
        reference: "REF-00050",
        amount: "50.00",
        currency: "USD",
        imagePath: "comprobantes/x/a.png",
      }),
    ).rejects.toThrow(NotOwnerError);
  });

  it("el cobro en efectivo completo salda una reserva de pago en sitio", async () => {
    const { salida, agencia } = await createDepartureFixture({ capacity: 20 });
    const metodo = await createPaymentMethodFixture({ kind: "FISICO", currency: "USD" });
    const cuenta = await createAccountFixture();
    const operador = await createPanelUserFixture({ agencyId: agencia.id });

    const reserva = await createReservation({
      accountId: cuenta.id,
      departureId: salida.id,
      paymentMethodId: metodo.id,
      companions: [],
      policiesAccepted: true,
    });

    const resultado = await registerCashPayment({
      reservationId: reserva.reservationId,
      panelUserId: operador.id,
      agencyId: agencia.id,
      amount: "47.50",
      currency: "USD",
    });

    expect(resultado.shouldIssueTicket).toBe(true);
    const fila = await prisma.reservation.findUniqueOrThrow({
      where: { id: reserva.reservationId },
      include: { cashPayments: true },
    });
    expect(fila.status).toBe("PAGADA");
    expect(fila.cashPayments).toHaveLength(1);
  });

  it("rechazar un comprobante libera el cupo solo si la reserva se cancela", async () => {
    const { salida } = await createDepartureFixture({ capacity: 5 });
    const antes = await getAvailability(salida.id);
    expect(antes.available).toBe(5);
  });
});
