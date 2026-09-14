import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { createReservation } from "@/modules/booking";
import { approveProof, registerCashPayment, submitProof } from "@/modules/payments";
import { agencyDashboard, listRecentTickets } from "@/modules/reports";
import { issueTicket } from "@/modules/tickets";
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

const RANGE = { from: new Date("2026-09-01T00:00:00Z"), to: new Date("2026-09-10T23:59:59Z") };
const DENTRO = new Date("2026-09-05T12:00:00Z");
const FUERA = new Date("2026-08-20T12:00:00Z");

async function reservar(salidaId: string, paymentMethodId: string) {
  const cuenta = await createAccountFixture();
  const reserva = await createReservation({
    accountId: cuenta.id,
    departureId: salidaId,
    paymentMethodId,
    companions: [],
    policiesAccepted: true,
  });
  return { ...reserva, accountId: cuenta.id };
}

describe("agencyDashboard: pendingTickets", () => {
  it("cuenta la cola en vivo con su desglose, sin importar el rango, y aísla por agencia y por salida en ruta", async () => {
    const { salida, agencia } = await createDepartureFixture({});
    const digital = await createPaymentMethodFixture({ kind: "DIGITAL", currency: "USD" });
    const fisico = await createPaymentMethodFixture({ kind: "FISICO", currency: "USD" });
    const operador = await createPanelUserFixture({ agencyId: agencia.id });

    // PENDIENTE_PAGO sin ningún pago.
    await reservar(salida.id, digital.id);

    // EN_VALIDACION con un comprobante pendiente.
    const enValidacion = await reservar(salida.id, digital.id);
    await submitProof({
      reservationId: enValidacion.reservationId,
      accountId: enValidacion.accountId,
      paymentMethodId: digital.id,
      reference: "REF-VALIDACION",
      amount: "10.00",
      currency: "USD",
      imagePath: "comprobantes/a.png",
    });

    // PAGO_EN_SITIO recién creada.
    await reservar(salida.id, fisico.id);

    // PAGADA: no debe contar en la cola pendiente.
    const pagada = await reservar(salida.id, digital.id);
    const comprobante = await submitProof({
      reservationId: pagada.reservationId,
      accountId: pagada.accountId,
      paymentMethodId: digital.id,
      reference: "REF-PAGADA",
      amount: "47.50",
      currency: "USD",
      imagePath: "comprobantes/b.png",
    });
    await approveProof({
      proofId: comprobante.proofId,
      panelUserId: operador.id,
      agencyId: agencia.id,
    });

    // Reserva abierta de una salida ya EN_RUTA: no debe contar.
    const { salida: salidaEnRuta } = await createDepartureFixture({ agencyId: agencia.id });
    await reservar(salidaEnRuta.id, digital.id);
    await prisma.departure.update({ where: { id: salidaEnRuta.id }, data: { status: "EN_RUTA" } });

    // Reserva de otra agencia: nunca debe sumar.
    const { salida: salidaOtra, agencia: otraAgencia } = await createDepartureFixture({});
    const metodoOtra = await createPaymentMethodFixture({ kind: "DIGITAL", currency: "USD" });
    await reservar(salidaOtra.id, metodoOtra.id);

    const resumen = await agencyDashboard(agencia.id, RANGE);

    expect(resumen.pendingTickets.total).toBe(3);
    expect(resumen.pendingTickets.proofsToReview).toBe(1);
    expect(resumen.pendingTickets.payOnSite).toBe(1);

    const resumenOtra = await agencyDashboard(otraAgencia.id, RANGE);
    expect(resumenOtra.pendingTickets.total).toBe(1);
  });
});

describe("agencyDashboard: departures", () => {
  it("agrupa las salidas por estado dentro del rango, excluye canceladas y las fuera de rango", async () => {
    const { salida: s1, agencia } = await createDepartureFixture({});
    await prisma.departure.update({
      where: { id: s1.id },
      data: { status: "PROGRAMADA", departsAt: DENTRO },
    });

    const { salida: s2 } = await createDepartureFixture({ agencyId: agencia.id });
    await prisma.departure.update({
      where: { id: s2.id },
      data: { status: "MANIFIESTO_CERRADO", departsAt: DENTRO },
    });

    const { salida: s3 } = await createDepartureFixture({ agencyId: agencia.id });
    await prisma.departure.update({
      where: { id: s3.id },
      data: { status: "EN_RUTA", departsAt: DENTRO },
    });

    const { salida: s4 } = await createDepartureFixture({ agencyId: agencia.id });
    await prisma.departure.update({
      where: { id: s4.id },
      data: { status: "FINALIZADA", departsAt: DENTRO },
    });

    const { salida: s5 } = await createDepartureFixture({ agencyId: agencia.id });
    await prisma.departure.update({
      where: { id: s5.id },
      data: { status: "CANCELADA", departsAt: DENTRO },
    });

    const { salida: s6 } = await createDepartureFixture({ agencyId: agencia.id });
    await prisma.departure.update({
      where: { id: s6.id },
      data: { status: "PROGRAMADA", departsAt: FUERA },
    });

    const resumen = await agencyDashboard(agencia.id, RANGE);

    expect(resumen.departures).toEqual({
      total: 4,
      programadas: 1,
      embarcando: 1,
      enRuta: 1,
      finalizadas: 1,
    });
  });
});

describe("agencyDashboard: revenue", () => {
  it("suma comprobantes aprobados y cobros en efectivo dentro del rango, aislado por agencia", async () => {
    const { salida, agencia } = await createDepartureFixture({});
    const digital = await createPaymentMethodFixture({ kind: "DIGITAL", currency: "USD" });
    const fisico = await createPaymentMethodFixture({ kind: "FISICO", currency: "USD" });
    const operador = await createPanelUserFixture({ agencyId: agencia.id });

    const aprobada = await reservar(salida.id, digital.id);
    const comprobante = await submitProof({
      reservationId: aprobada.reservationId,
      accountId: aprobada.accountId,
      paymentMethodId: digital.id,
      reference: "REF-DENTRO",
      amount: "47.50",
      currency: "USD",
      imagePath: "comprobantes/c.png",
    });
    await approveProof({
      proofId: comprobante.proofId,
      panelUserId: operador.id,
      agencyId: agencia.id,
      now: DENTRO,
    });

    const cobrada = await reservar(salida.id, fisico.id);
    await registerCashPayment({
      reservationId: cobrada.reservationId,
      panelUserId: operador.id,
      agencyId: agencia.id,
      amount: "47.50",
      currency: "USD",
      now: DENTRO,
    });

    const fueraDeRango = await reservar(salida.id, digital.id);
    const comprobanteFuera = await submitProof({
      reservationId: fueraDeRango.reservationId,
      accountId: fueraDeRango.accountId,
      paymentMethodId: digital.id,
      reference: "REF-FUERA",
      amount: "47.50",
      currency: "USD",
      imagePath: "comprobantes/d.png",
    });
    await approveProof({
      proofId: comprobanteFuera.proofId,
      panelUserId: operador.id,
      agencyId: agencia.id,
      now: FUERA,
    });

    const resumen = await agencyDashboard(agencia.id, RANGE);

    expect(resumen.revenue.payments).toBe(2);
    expect(resumen.revenue.totalUsd.toString()).toBe("95");
  });
});

describe("agencyDashboard: failedMessages", () => {
  it("cuenta los mensajes fallidos de la agencia, sin contar los de otra", async () => {
    const { salida, agencia } = await createDepartureFixture({});
    const digital = await createPaymentMethodFixture({ kind: "DIGITAL", currency: "USD" });
    const reserva = await reservar(salida.id, digital.id);
    await prisma.outboundMessage.create({
      data: {
        reservationId: reserva.reservationId,
        phone: "+584120000000",
        templateKey: "prueba",
        payload: {},
        status: "FALLIDO",
      },
    });

    const { salida: salidaOtra } = await createDepartureFixture({});
    const metodoOtra = await createPaymentMethodFixture({ kind: "DIGITAL", currency: "USD" });
    const reservaOtra = await reservar(salidaOtra.id, metodoOtra.id);
    await prisma.outboundMessage.create({
      data: {
        reservationId: reservaOtra.reservationId,
        phone: "+584120000000",
        templateKey: "prueba",
        payload: {},
        status: "FALLIDO",
      },
    });

    const resumen = await agencyDashboard(agencia.id, RANGE);

    expect(resumen.failedMessages).toBe(1);
  });
});

describe("listRecentTickets", () => {
  it("ordena por emisión descendente, respeta el límite, cuenta el total y aísla por agencia", async () => {
    const { salida, agencia } = await createDepartureFixture({});
    const fisico = await createPaymentMethodFixture({ kind: "FISICO", currency: "USD" });
    const operador = await createPanelUserFixture({ agencyId: agencia.id });

    async function ticketPagado(fecha: Date) {
      const reserva = await reservar(salida.id, fisico.id);
      await registerCashPayment({
        reservationId: reserva.reservationId,
        panelUserId: operador.id,
        agencyId: agencia.id,
        amount: "47.50",
        currency: "USD",
      });
      await issueTicket(reserva.reservationId);
      await prisma.ticket.update({
        where: { reservationId: reserva.reservationId },
        data: { issuedAt: fecha },
      });
      return reserva;
    }

    const t1 = await ticketPagado(new Date("2026-09-05T10:00:00Z"));
    const t2 = await ticketPagado(new Date("2026-09-06T10:00:00Z"));
    const t3 = await ticketPagado(new Date("2026-09-07T10:00:00Z"));
    await ticketPagado(FUERA);
    void t1;

    const { salida: salidaOtra, agencia: otraAgencia } = await createDepartureFixture({});
    const fisicoOtro = await createPaymentMethodFixture({ kind: "FISICO", currency: "USD" });
    const operadorOtro = await createPanelUserFixture({ agencyId: otraAgencia.id });
    const reservaOtra = await reservar(salidaOtra.id, fisicoOtro.id);
    await registerCashPayment({
      reservationId: reservaOtra.reservationId,
      panelUserId: operadorOtro.id,
      agencyId: otraAgencia.id,
      amount: "47.50",
      currency: "USD",
    });
    await issueTicket(reservaOtra.reservationId);
    await prisma.ticket.update({
      where: { reservationId: reservaOtra.reservationId },
      data: { issuedAt: DENTRO },
    });

    const resultado = await listRecentTickets(agencia.id, {
      from: RANGE.from,
      to: RANGE.to,
      limit: 2,
    });

    expect(resultado.total).toBe(3);
    expect(resultado.rows).toHaveLength(2);
    expect(resultado.rows.map((r) => r.reservationId)).toEqual([
      t3.reservationId,
      t2.reservationId,
    ]);
    expect(resultado.rows[0]?.salesChannel).toBe("APP");
    expect(resultado.rows[0]?.totalUsd).toBe("47.5");
    expect(resultado.rows[0]?.code).toBe(t3.code);
  });
});
