import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { maskIdNumber } from "@/lib/identity";
import { ForbiddenError } from "@/modules/auth";
import { createReservation } from "@/modules/booking";
import { approveProof, countPendingProofs, registerCashPayment, submitProof } from "@/modules/payments";
import {
  countAgencyReservationViews,
  getAgencyReservationDetail,
  listAgencyPassengers,
  listPendingProofQueue,
} from "@/modules/reports";
import { issueTicket } from "@/modules/tickets";
import type { PaymentState } from "@/modules/reports";
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
  await issueTicket(pagada.reservationId);

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

describe("listAgencyPassengers filtrado por vista", () => {
  it("cada vista trae exactamente las reservas esperadas", async () => {
    const { agencia, pendiente, enValidacion, abonada, enSitio, pagada, cancelada, otraReserva } =
      await escenario();

    const porRevisar = await listAgencyPassengers(agencia.id, { view: "por-revisar" });
    expect(porRevisar.rows.map((r) => r.reservationId)).toEqual([enValidacion.reservationId]);

    const porCobrar = await listAgencyPassengers(agencia.id, { view: "por-cobrar" });
    expect(porCobrar.rows.map((r) => r.reservationId).sort()).toEqual(
      [
        pendiente.reservationId,
        enValidacion.reservationId,
        abonada.reservationId,
        enSitio.reservationId,
      ].sort(),
    );

    const pagadasVista = await listAgencyPassengers(agencia.id, { view: "pagadas" });
    expect(pagadasVista.rows.map((r) => r.reservationId)).toEqual([pagada.reservationId]);

    const sinEfecto = await listAgencyPassengers(agencia.id, { view: "sin-efecto" });
    expect(sinEfecto.rows.map((r) => r.reservationId)).toEqual([cancelada.reservationId]);

    const todas = await listAgencyPassengers(agencia.id, { view: "todas" });
    expect(todas.rows.map((r) => r.reservationId).sort()).toEqual(
      [
        pendiente.reservationId,
        enValidacion.reservationId,
        abonada.reservationId,
        enSitio.reservationId,
        pagada.reservationId,
        cancelada.reservationId,
      ].sort(),
    );

    for (const vista of ["por-revisar", "por-cobrar", "pagadas", "sin-efecto", "todas"] as const) {
      const resultado = await listAgencyPassengers(agencia.id, { view: vista });
      expect(resultado.rows.map((r) => r.reservationId)).not.toContain(otraReserva.reservationId);
    }
  });

  it("por-cobrar se ordena por la fecha de salida, la más próxima primero", async () => {
    const agenciaPropia = await createAgencyFixture();
    const digital = await createPaymentMethodFixture({ kind: "DIGITAL", currency: "USD" });
    const { salida: salidaLejana } = await createDepartureFixture({
      agencyId: agenciaPropia.id,
      hoursFromNow: 96,
    });
    const { salida: salidaCercana } = await createDepartureFixture({
      agencyId: agenciaPropia.id,
      hoursFromNow: 24,
    });

    const cuentaLejana = await createAccountFixture();
    const reservaLejana = await createReservation({
      accountId: cuentaLejana.id,
      departureId: salidaLejana.id,
      paymentMethodId: digital.id,
      companions: [],
      policiesAccepted: true,
    });

    const cuentaCercana = await createAccountFixture();
    const reservaCercana = await createReservation({
      accountId: cuentaCercana.id,
      departureId: salidaCercana.id,
      paymentMethodId: digital.id,
      companions: [],
      policiesAccepted: true,
    });

    const resultado = await listAgencyPassengers(agenciaPropia.id, { view: "por-cobrar" });

    expect(resultado.rows.map((r) => r.reservationId)).toEqual([
      reservaCercana.reservationId,
      reservaLejana.reservationId,
    ]);
  });

  it("expone hasPendingProof, ticketIssuedAt, salesChannel y departureStatus", async () => {
    const { agencia, enValidacion, pagada, pendiente } = await escenario();

    const resultado = await listAgencyPassengers(agencia.id, {});
    const filaEnValidacion = resultado.rows.find((r) => r.reservationId === enValidacion.reservationId)!;
    const filaPagada = resultado.rows.find((r) => r.reservationId === pagada.reservationId)!;
    const filaPendiente = resultado.rows.find((r) => r.reservationId === pendiente.reservationId)!;

    expect(filaEnValidacion.hasPendingProof).toBe(true);
    expect(filaPendiente.hasPendingProof).toBe(false);
    expect(filaPagada.hasPendingProof).toBe(false);

    expect(filaPagada.ticketIssuedAt).not.toBeNull();
    expect(filaPendiente.ticketIssuedAt).toBeNull();

    expect(filaPendiente.salesChannel).toBe("APP");
    expect(filaPendiente.departureStatus).toBe("PROGRAMADA");
  });
});

describe("countAgencyReservationViews", () => {
  it("coincide con los totales de cada vista", async () => {
    const { agencia } = await escenario();

    const conteos = await countAgencyReservationViews(agencia.id);

    expect(conteos["por-revisar"]).toBe(1);
    expect(conteos["por-cobrar"]).toBe(4);
    expect(conteos.pagadas).toBe(1);
    expect(conteos["sin-efecto"]).toBe(1);
    expect(conteos.todas).toBe(6);
  });

  it("aísla por agencia", async () => {
    const { otraAgencia } = await escenario();

    const conteos = await countAgencyReservationViews(otraAgencia.id);

    expect(conteos.todas).toBe(1);
    expect(conteos["por-revisar"]).toBe(0);
  });
});

describe("listPendingProofQueue", () => {
  it("ordena primero por la salida más próxima y deja al final las salidas que ya partieron, sin ocultar ninguna", async () => {
    const { salida: salidaEn3Dias, agencia } = await createDepartureFixture({ capacity: 10, hoursFromNow: 72 });
    const { salida: salidaEn30Min } = await createDepartureFixture({
      capacity: 10,
      hoursFromNow: 0.5,
      agencyId: agencia.id,
    });
    const { salida: salidaQuePartio } = await createDepartureFixture({
      capacity: 10,
      hoursFromNow: 48,
      agencyId: agencia.id,
    });
    const metodo = await createPaymentMethodFixture({ kind: "DIGITAL", currency: "USD" });

    async function comprobantePara(departureId: string, reference: string) {
      const cuenta = await createAccountFixture();
      const reserva = await createReservation({
        accountId: cuenta.id,
        departureId,
        paymentMethodId: metodo.id,
        companions: [],
        policiesAccepted: true,
      });
      const comprobante = await submitProof({
        reservationId: reserva.reservationId,
        accountId: cuenta.id,
        paymentMethodId: metodo.id,
        reference,
        amount: "10.00",
        currency: "USD",
        imagePath: `comprobantes/orden/${reference}.png`,
      });
      return comprobante.proofId;
    }

    // Se cargan en este orden: el del bus que sale en 30 minutos llega de último.
    const enTresDias = await comprobantePara(salidaEn3Dias.id, "REF-3D");
    const yaPartio = await comprobantePara(salidaQuePartio.id, "REF-PARTIO");
    const enTreintaMin = await comprobantePara(salidaEn30Min.id, "REF-30M");
    const base = Date.now();
    await prisma.paymentProof.update({ where: { id: enTresDias }, data: { createdAt: new Date(base - 3 * 3_600_000) } });
    await prisma.paymentProof.update({ where: { id: yaPartio }, data: { createdAt: new Date(base - 2 * 3_600_000) } });
    await prisma.paymentProof.update({ where: { id: enTreintaMin }, data: { createdAt: new Date(base - 3_600_000) } });
    // La tercera salida ya partió: está en ruta y su hora pasó.
    await prisma.departure.update({
      where: { id: salidaQuePartio.id },
      data: { status: "EN_RUTA", departsAt: new Date(base - 2 * 3_600_000) },
    });

    const resultado = await listPendingProofQueue(agencia.id);

    expect(resultado.rows.map((r) => r.proofId)).toEqual([enTreintaMin, enTresDias, yaPartio]);
    expect(resultado.total).toBe(await countPendingProofs(agencia.id));
    expect(resultado.total).toBe(3);
  });

  it("trae los comprobantes pendientes con cobertura y cédula enmascarada", async () => {
    const { agencia, enValidacion } = await escenario();

    const resultado = await listPendingProofQueue(agencia.id, { pageSize: 10 });

    expect(resultado.total).toBe(1);
    expect(resultado.page).toBe(1);
    expect(resultado.pageSize).toBe(10);
    const fila = resultado.rows[0]!;
    expect(fila.reservationId).toBe(enValidacion.reservationId);
    expect(fila.maskedHolderIdNumber).toMatch(/\*/);
    expect(fila.coverage.kind).toBe("ABONO_PARCIAL");
    expect(fila.balanceUsd).toBeDefined();
  });

  it("pageSize por defecto 25, con mínimo 10 y máximo 100", async () => {
    const { agencia } = await escenario();

    expect((await listPendingProofQueue(agencia.id)).pageSize).toBe(25);
    expect((await listPendingProofQueue(agencia.id, { pageSize: 1 })).pageSize).toBe(10);
    expect((await listPendingProofQueue(agencia.id, { pageSize: 500 })).pageSize).toBe(100);
  });

  it("nunca trae comprobantes de otra agencia", async () => {
    const { agencia } = await escenario();
    const { salida: salidaOtra, agencia: otraAgencia } = await createDepartureFixture({ capacity: 10 });
    const metodoOtra = await createPaymentMethodFixture({ kind: "DIGITAL", currency: "USD" });
    const cuentaOtra = await createAccountFixture();
    const reservaOtra = await createReservation({
      accountId: cuentaOtra.id,
      departureId: salidaOtra.id,
      paymentMethodId: metodoOtra.id,
      companions: [],
      policiesAccepted: true,
    });
    await submitProof({
      reservationId: reservaOtra.reservationId,
      accountId: cuentaOtra.id,
      paymentMethodId: metodoOtra.id,
      reference: "REF-OTRA",
      amount: "10.00",
      currency: "USD",
      imagePath: "comprobantes/otra/a.png",
    });

    const resultadoAgencia = await listPendingProofQueue(agencia.id);
    expect(resultadoAgencia.rows.map((r) => r.reservationId)).not.toContain(reservaOtra.reservationId);

    const resultadoOtra = await listPendingProofQueue(otraAgencia.id);
    expect(resultadoOtra.rows.map((r) => r.reservationId)).toEqual([reservaOtra.reservationId]);
  });
});

/** Reserva de dos pasajeros con un comprobante aprobado, un cobro en efectivo y un comprobante pendiente. */
async function escenarioDetalle() {
  const { salida, agencia } = await createDepartureFixture({ capacity: 20 });
  const metodo = await createPaymentMethodFixture({ kind: "DIGITAL", currency: "USD" });
  const cuenta = await createAccountFixture();
  const operador = await createPanelUserFixture({ agencyId: agencia.id });

  const reserva = await createReservation({
    accountId: cuenta.id,
    departureId: salida.id,
    paymentMethodId: metodo.id,
    companions: [{ fullName: "Acompañante", idNumber: "V33333333", birthYear: 1990 }],
    policiesAccepted: true,
  });

  const aprobado = await submitProof({
    reservationId: reserva.reservationId,
    accountId: cuenta.id,
    paymentMethodId: metodo.id,
    reference: "REF-A",
    amount: "50.00",
    currency: "USD",
    imagePath: "comprobantes/d/a.png",
  });
  await approveProof({ proofId: aprobado.proofId, panelUserId: operador.id, agencyId: agencia.id });

  await registerCashPayment({
    reservationId: reserva.reservationId,
    panelUserId: operador.id,
    agencyId: agencia.id,
    amount: "10.00",
    currency: "USD",
  });

  const pendiente = await submitProof({
    reservationId: reserva.reservationId,
    accountId: cuenta.id,
    paymentMethodId: metodo.id,
    reference: "REF-P",
    amount: "20.00",
    currency: "USD",
    imagePath: "comprobantes/d/p.png",
  });

  return { salida, agencia, metodo, cuenta, operador, reserva, pendienteId: pendiente.proofId };
}

describe("getAgencyReservationDetail", () => {
  it("trae totales, pasajeros enmascarados, comprobantes pendientes y separa el historial", async () => {
    const { agencia, cuenta, reserva, pendienteId } = await escenarioDetalle();

    const detalle = await getAgencyReservationDetail(reserva.reservationId, agencia.id);

    expect(detalle).not.toBeNull();
    expect(detalle!.reservation.id).toBe(reserva.reservationId);
    expect(detalle!.reservation.totalUsd.toString()).toBe("95");
    expect(detalle!.reservation.paidUsd.toString()).toBe("60");
    expect(detalle!.reservation.balanceUsd.toString()).toBe("35");

    expect(detalle!.holder.fullName).toBe(cuenta.fullName);
    expect(detalle!.holder.maskedIdNumber).toBe(maskIdNumber(cuenta.idNumber));
    expect(detalle!.holder.maskedIdNumber).not.toBe(cuenta.idNumber);

    expect(detalle!.passengers).toHaveLength(2);
    expect(detalle!.passengers.every((p) => p.maskedIdNumber.includes("*"))).toBe(true);
    expect(detalle!.passengers.some((p) => p.isHolder)).toBe(true);

    expect(detalle!.pendingProofs).toHaveLength(1);
    expect(detalle!.pendingProofs[0]!.id).toBe(pendienteId);

    expect(detalle!.history).toHaveLength(2);
    expect(detalle!.history.some((h) => h.kind === "EFECTIVO")).toBe(true);
    expect(detalle!.history.some((h) => h.status === "APROBADO")).toBe(true);
    expect(detalle!.history.every((h) => h.status !== "PENDIENTE")).toBe(true);
    expect(detalle!.history.every((h) => h.id !== pendienteId)).toBe(true);

    expect(detalle!.ticket).toBeNull();
  });

  it("canRegisterCash es verdadero en PENDIENTE_PAGO con saldo y falso en PAGADA", async () => {
    const { salida, agencia } = await createDepartureFixture({ capacity: 10 });
    const digital = await createPaymentMethodFixture({ kind: "DIGITAL", currency: "USD" });
    const cuenta = await createAccountFixture();
    const operador = await createPanelUserFixture({ agencyId: agencia.id });
    const reserva = await createReservation({
      accountId: cuenta.id,
      departureId: salida.id,
      paymentMethodId: digital.id,
      companions: [],
      policiesAccepted: true,
    });

    const pendiente = await getAgencyReservationDetail(reserva.reservationId, agencia.id);
    expect(pendiente!.reservation.status).toBe("PENDIENTE_PAGO");
    expect(pendiente!.canRegisterCash).toBe(true);

    const comprobante = await submitProof({
      reservationId: reserva.reservationId,
      accountId: cuenta.id,
      paymentMethodId: digital.id,
      reference: "REF-FULL",
      amount: "47.50",
      currency: "USD",
      imagePath: "comprobantes/full/a.png",
    });
    await approveProof({ proofId: comprobante.proofId, panelUserId: operador.id, agencyId: agencia.id });
    await issueTicket(reserva.reservationId);

    const pagada = await getAgencyReservationDetail(reserva.reservationId, agencia.id);
    expect(pagada!.reservation.status).toBe("PAGADA");
    expect(pagada!.canRegisterCash).toBe(false);
    expect(pagada!.ticket).not.toBeNull();
  });

  it("devuelve null si la reserva no existe", async () => {
    const { agencia } = await escenarioDetalle();

    const detalle = await getAgencyReservationDetail(
      "00000000-0000-0000-0000-000000000000",
      agencia.id,
    );

    expect(detalle).toBeNull();
  });

  it("lanza ForbiddenError si la reserva es de otra agencia", async () => {
    const { reserva } = await escenarioDetalle();
    const otraAgencia = await createAgencyFixture();

    await expect(getAgencyReservationDetail(reserva.reservationId, otraAgencia.id)).rejects.toThrow(
      ForbiddenError,
    );
  });
});

describe("countPendingProofs", () => {
  it("cuenta solo los comprobantes pendientes de la agencia", async () => {
    const { agencia } = await escenario();

    expect(await countPendingProofs(agencia.id)).toBe(1);
  });

  it("aísla por agencia", async () => {
    const { otraAgencia } = await escenario();

    expect(await countPendingProofs(otraAgencia.id)).toBe(0);
  });
});
