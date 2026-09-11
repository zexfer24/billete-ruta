import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { createReservation } from "@/modules/booking";
import { approveProof, registerCashPayment, submitProof } from "@/modules/payments";
import { listAgencyPassengers } from "@/modules/reports";
import type { PaymentState } from "@/modules/reports";
import {
  createAccountFixture,
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

/**
 * Una agencia con seis reservas, una por cada caso de estado de pago, más una
 * reserva de otra agencia que nunca debe aparecer en los resultados.
 */
async function escenario() {
  const { salida, agencia } = await createDepartureFixture({ capacity: 40 });
  const digital = await createPaymentMethodFixture({ kind: "DIGITAL", currency: "USD" });
  const fisico = await createPaymentMethodFixture({ kind: "FISICO", currency: "USD" });
  const operador = await createPanelUserFixture({ agencyId: agencia.id });

  async function reservar() {
    const cuenta = await createAccountFixture();
    const reserva = await createReservation({
      accountId: cuenta.id,
      departureId: salida.id,
      paymentMethodId: digital.id,
      companions: [],
      policiesAccepted: true,
    });
    return { ...reserva, accountId: cuenta.id };
  }

  // PENDIENTE_PAGO sin ningún pago.
  const pendiente = await reservar();

  // EN_VALIDACION con un comprobante cargado pero no aprobado.
  const enValidacion = await reservar();
  await submitProof({
    reservationId: enValidacion.reservationId,
    accountId: enValidacion.accountId,
    paymentMethodId: digital.id,
    reference: "REF-VALIDACION",
    amount: "20.00",
    currency: "USD",
    imagePath: "comprobantes/x/a.png",
  });

  // ABONADA con un comprobante parcial aprobado.
  const abonada = await reservar();
  const comprobanteAbonada = await submitProof({
    reservationId: abonada.reservationId,
    accountId: abonada.accountId,
    paymentMethodId: digital.id,
    reference: "REF-ABONADA",
    amount: "20.00",
    currency: "USD",
    imagePath: "comprobantes/x/b.png",
  });
  await approveProof({
    proofId: comprobanteAbonada.proofId,
    panelUserId: operador.id,
    agencyId: agencia.id,
  });

  // PAGO_EN_SITIO con un cobro en efectivo parcial.
  const cuentaEnSitio = await createAccountFixture();
  const enSitio = await createReservation({
    accountId: cuentaEnSitio.id,
    departureId: salida.id,
    paymentMethodId: fisico.id,
    companions: [],
    policiesAccepted: true,
  });
  await registerCashPayment({
    reservationId: enSitio.reservationId,
    panelUserId: operador.id,
    agencyId: agencia.id,
    amount: "10.00",
    currency: "USD",
  });

  // PAGADA, pago completo.
  const pagada = await reservar();
  const comprobantePagada = await submitProof({
    reservationId: pagada.reservationId,
    accountId: pagada.accountId,
    paymentMethodId: digital.id,
    reference: "REF-PAGADA",
    amount: "47.50",
    currency: "USD",
    imagePath: "comprobantes/x/c.png",
  });
  await approveProof({
    proofId: comprobantePagada.proofId,
    panelUserId: operador.id,
    agencyId: agencia.id,
  });

  // CANCELADA, con estado forzado directamente.
  const cancelada = await reservar();
  await prisma.reservation.update({
    where: { id: cancelada.reservationId },
    data: { status: "CANCELADA" },
  });

  // Reserva de otra agencia, nunca debe aparecer.
  const { salida: salidaOtra, agencia: otraAgencia } = await createDepartureFixture({
    capacity: 10,
  });
  const cuentaOtra = await createAccountFixture();
  const metodoOtra = await createPaymentMethodFixture({ kind: "DIGITAL", currency: "USD" });
  const otraReserva = await createReservation({
    accountId: cuentaOtra.id,
    departureId: salidaOtra.id,
    paymentMethodId: metodoOtra.id,
    companions: [],
    policiesAccepted: true,
  });

  return {
    agencia,
    otraAgencia,
    pendiente,
    enValidacion,
    abonada,
    enSitio,
    pagada,
    cancelada,
    otraReserva,
  };
}

describe("listAgencyPassengers filtrado por estado de pago", () => {
  it("Pendiente trae PENDIENTE_PAGO y EN_VALIDACION sin nada pagado", async () => {
    const { agencia, pendiente, enValidacion } = await escenario();

    const resultado = await listAgencyPassengers(agencia.id, { paymentState: "Pendiente" });

    expect(resultado.rows.map((r) => r.reservationId).sort()).toEqual(
      [pendiente.reservationId, enValidacion.reservationId].sort(),
    );
    for (const fila of resultado.rows) expect(fila.paymentState).toBe("Pendiente");
  });

  it("una reserva en validación sin comprobantes aprobados aparece en Pendiente, no en Abonado", async () => {
    const { agencia, enValidacion } = await escenario();

    const pendientes = await listAgencyPassengers(agencia.id, { paymentState: "Pendiente" });
    const abonados = await listAgencyPassengers(agencia.id, { paymentState: "Abonado" });

    expect(pendientes.rows.map((r) => r.reservationId)).toContain(enValidacion.reservationId);
    expect(abonados.rows.map((r) => r.reservationId)).not.toContain(enValidacion.reservationId);
  });

  it("Abonado trae ABONADA y PAGO_EN_SITIO con algo pagado", async () => {
    const { agencia, abonada, enSitio } = await escenario();

    const resultado = await listAgencyPassengers(agencia.id, { paymentState: "Abonado" });

    expect(resultado.rows.map((r) => r.reservationId).sort()).toEqual(
      [abonada.reservationId, enSitio.reservationId].sort(),
    );
    for (const fila of resultado.rows) expect(fila.paymentState).toBe("Abonado");
  });

  it("Confirmado trae solo PAGADA", async () => {
    const { agencia, pagada } = await escenario();

    const resultado = await listAgencyPassengers(agencia.id, { paymentState: "Confirmado" });

    expect(resultado.rows.map((r) => r.reservationId)).toEqual([pagada.reservationId]);
    expect(resultado.rows[0]?.paymentState).toBe("Confirmado");
  });

  it("Sin efecto trae solo CANCELADA", async () => {
    const { agencia, cancelada } = await escenario();

    const resultado = await listAgencyPassengers(agencia.id, { paymentState: "Sin efecto" });

    expect(resultado.rows.map((r) => r.reservationId)).toEqual([cancelada.reservationId]);
    expect(resultado.rows[0]?.paymentState).toBe("Sin efecto");
  });

  it("nunca trae la reserva de otra agencia, con o sin filtro", async () => {
    const { agencia, otraReserva } = await escenario();

    const sinFiltro = await listAgencyPassengers(agencia.id, {});
    expect(sinFiltro.rows.map((r) => r.reservationId)).not.toContain(otraReserva.reservationId);

    for (const estado of ["Pendiente", "Abonado", "Confirmado", "Sin efecto"] as PaymentState[]) {
      const resultado = await listAgencyPassengers(agencia.id, { paymentState: estado });
      expect(resultado.rows.map((r) => r.reservationId)).not.toContain(otraReserva.reservationId);
    }
  });
});
