import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { ForbiddenError } from "@/modules/auth";
import { createReservation } from "@/modules/booking";
import {
  approveProof,
  getProofReview,
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
async function escenario() {
  const { salida, agencia } = await createDepartureFixture({ capacity: 20 });
  const metodo = await createPaymentMethodFixture({ kind: "DIGITAL", currency: "USD" });
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

/**
 * Construye el escenario completo del brief: comprobante A aprobado (50),
 * cobro en efectivo (10), comprobante B rechazado (20) y comprobante C
 * pendiente (30), en ese orden.
 */
async function escenarioConHistorial() {
  const { salida, agencia, metodo, cuenta, operador, reserva } = await escenario();

  const a = await submitProof({
    reservationId: reserva.reservationId,
    accountId: cuenta.id,
    paymentMethodId: metodo.id,
    reference: "REF-A-0050",
    amount: "50.00",
    currency: "USD",
    imagePath: "comprobantes/x/a.png",
  });
  await approveProof({ proofId: a.proofId, panelUserId: operador.id, agencyId: agencia.id });

  await registerCashPayment({
    reservationId: reserva.reservationId,
    panelUserId: operador.id,
    agencyId: agencia.id,
    amount: "10.00",
    currency: "USD",
  });

  const b = await submitProof({
    reservationId: reserva.reservationId,
    accountId: cuenta.id,
    paymentMethodId: metodo.id,
    reference: "REF-B-0020",
    amount: "20.00",
    currency: "USD",
    imagePath: "comprobantes/x/b.png",
  });
  await rejectProof({
    proofId: b.proofId,
    panelUserId: operador.id,
    agencyId: agencia.id,
    reason: "Comprobante ilegible",
  });

  const c = await submitProof({
    reservationId: reserva.reservationId,
    accountId: cuenta.id,
    paymentMethodId: metodo.id,
    reference: "REF-C-0030",
    amount: "30.00",
    currency: "USD",
    imagePath: "comprobantes/x/c.png",
  });

  return { salida, agencia, metodo, cuenta, operador, reserva, proofAId: a.proofId, proofBId: b.proofId, proofCId: c.proofId };
}

describe("getProofReview", () => {
  it("devuelve el comprobante pendiente, la reserva, la cobertura y el historial", async () => {
    const { agencia, cuenta, reserva, proofCId } = await escenarioConHistorial();

    const revision = await getProofReview(proofCId, agencia.id);

    expect(revision).not.toBeNull();
    expect(revision!.proof.id).toBe(proofCId);
    expect(revision!.proof.reference).toBe("REF-C-0030");
    expect(revision!.proof.amountUsd.toString()).toBe("30");
    expect(revision!.proof.status).toBe("PENDIENTE");
    expect(revision!.proof.imagePath).toBe("comprobantes/x/c.png");

    expect(revision!.reservation.id).toBe(reserva.reservationId);
    expect(revision!.reservation.holderName).toBe(cuenta.fullName);
    expect(revision!.reservation.holderIdNumber).toBe(cuenta.idNumber);
    expect(revision!.reservation.totalUsd.toString()).toBe("142.5");
    expect(revision!.reservation.paidUsd.toString()).toBe("60");

    expect(revision!.coverage).not.toBeNull();
    expect(revision!.coverage!.kind).toBe("ABONO_PARCIAL");
    expect(revision!.coverage!.balanceBeforeUsd.toString()).toBe("82.5");
    expect(revision!.coverage!.balanceAfterUsd.toString()).toBe("52.5");
    expect(revision!.coverage!.excessUsd.toString()).toBe("0");

    expect(revision!.history).toHaveLength(3);
    const [primero, segundo, tercero] = revision!.history;

    expect(primero!.kind).toBe("COMPROBANTE");
    expect(primero!.status).toBe("RECHAZADO");
    expect(primero!.reference).toBe("REF-B-0020");
    expect(primero!.rejectionReason).toBe("Comprobante ilegible");
    expect(primero!.amountUsd.toString()).toBe("20");

    expect(segundo!.kind).toBe("EFECTIVO");
    expect(segundo!.status).toBeNull();
    expect(segundo!.reference).toBeNull();
    expect(segundo!.rejectionReason).toBeNull();
    expect(segundo!.amountUsd.toString()).toBe("10");

    expect(tercero!.kind).toBe("COMPROBANTE");
    expect(tercero!.status).toBe("APROBADO");
    expect(tercero!.reference).toBe("REF-A-0050");
    expect(tercero!.rejectionReason).toBeNull();
    expect(tercero!.amountUsd.toString()).toBe("50");

    // orden descendente por fecha
    expect(primero!.at.getTime()).toBeGreaterThanOrEqual(segundo!.at.getTime());
    expect(segundo!.at.getTime()).toBeGreaterThanOrEqual(tercero!.at.getTime());

    // C no aparece en su propio historial
    expect(revision!.history.some((h) => h.reference === "REF-C-0030")).toBe(false);
  });

  it("no calcula cobertura para un comprobante ya revisado", async () => {
    const { agencia, proofAId } = await escenarioConHistorial();

    const revision = await getProofReview(proofAId, agencia.id);

    expect(revision).not.toBeNull();
    expect(revision!.proof.status).toBe("APROBADO");
    expect(revision!.coverage).toBeNull();
  });

  it("un operador de otra agencia no puede ver el comprobante", async () => {
    const { proofCId } = await escenarioConHistorial();
    const otraAgencia = await createAgencyFixture();

    await expect(getProofReview(proofCId, otraAgencia.id)).rejects.toThrow(ForbiddenError);
  });

  it("devuelve null si el comprobante no existe", async () => {
    const { agencia } = await escenarioConHistorial();

    const revision = await getProofReview("00000000-0000-0000-0000-000000000000", agencia.id);

    expect(revision).toBeNull();
  });
});
