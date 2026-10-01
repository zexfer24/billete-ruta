import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { createReservation, getAvailability, joinWaitlist } from "@/modules/booking";
import { registerCashPayment } from "@/modules/payments";
import { deliverPendingMessages, getFakeProvider } from "@/modules/messaging";
import { runSweeps } from "@/worker/sweeps";
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

describe("liberación por falta de pago", () => {
  it("libera la reserva vencida y devuelve el cupo", async () => {
    const { salida } = await createDepartureFixture({ capacity: 5 });
    const metodo = await createPaymentMethodFixture({ kind: "DIGITAL" });
    const cuenta = await createAccountFixture();

    const reserva = await createReservation({
      accountId: cuenta.id,
      departureId: salida.id,
      paymentMethodId: metodo.id,
      companions: [],
      policiesAccepted: true,
    });

    expect((await getAvailability(salida.id)).available).toBe(4);

    // Tres horas después, el plazo de dos horas ya venció.
    const resultado = await runSweeps(new Date(Date.now() + 3 * 3_600_000));

    expect(resultado.expiredUnpaid).toBe(1);
    const fila = await prisma.reservation.findUniqueOrThrow({
      where: { id: reserva.reservationId },
      include: { messages: true },
    });
    expect(fila.status).toBe("LIBERADA");
    expect(fila.messages.some((m) => m.templateKey === "reserva_liberada")).toBe(true);
    expect((await getAvailability(salida.id)).available).toBe(5);
  });

  it("no toca una reserva cuyo plazo aún no vence", async () => {
    const { salida } = await createDepartureFixture();
    const metodo = await createPaymentMethodFixture({ kind: "DIGITAL" });
    const cuenta = await createAccountFixture();
    const reserva = await createReservation({
      accountId: cuenta.id,
      departureId: salida.id,
      paymentMethodId: metodo.id,
      companions: [],
      policiesAccepted: true,
    });

    const resultado = await runSweeps(new Date());
    expect(resultado.expiredUnpaid).toBe(0);
    expect(
      (await prisma.reservation.findUniqueOrThrow({ where: { id: reserva.reservationId } })).status,
    ).toBe("PENDIENTE_PAGO");
  });
});

describe("recordatorio de 24 horas", () => {
  it("encola el recordatorio a las pagadas y la reconfirmación al pago en sitio", async () => {
    const { salida, agencia } = await createDepartureFixture({ hoursFromNow: 24 });
    const operador = await createPanelUserFixture({ agencyId: agencia.id });
    const fisico = await createPaymentMethodFixture({ kind: "FISICO" });

    const pagada = await createReservation({
      accountId: (await createAccountFixture()).id,
      departureId: salida.id,
      paymentMethodId: fisico.id,
      companions: [],
      policiesAccepted: true,
    });
    await registerCashPayment({
      reservationId: pagada.reservationId,
      panelUserId: operador.id,
      agencyId: agencia.id,
      amount: "47.50",
      currency: "USD",
    });

    const enSitio = await createReservation({
      accountId: (await createAccountFixture()).id,
      departureId: salida.id,
      paymentMethodId: fisico.id,
      companions: [],
      policiesAccepted: true,
    });

    await runSweeps(new Date());

    const recordatorio = await prisma.outboundMessage.findFirst({
      where: { reservationId: pagada.reservationId, templateKey: "recordatorio_24h" },
    });
    const reconfirmacion = await prisma.outboundMessage.findFirst({
      where: { reservationId: enSitio.reservationId, templateKey: "reconfirmacion_pago_sitio" },
    });
    expect(recordatorio).not.toBeNull();
    expect(reconfirmacion).not.toBeNull();
  });

  it("no duplica el recordatorio aunque el barrido corra dos veces", async () => {
    const { salida, agencia } = await createDepartureFixture({ hoursFromNow: 24 });
    const operador = await createPanelUserFixture({ agencyId: agencia.id });
    const fisico = await createPaymentMethodFixture({ kind: "FISICO" });
    const reserva = await createReservation({
      accountId: (await createAccountFixture()).id,
      departureId: salida.id,
      paymentMethodId: fisico.id,
      companions: [],
      policiesAccepted: true,
    });
    await registerCashPayment({
      reservationId: reserva.reservationId,
      panelUserId: operador.id,
      agencyId: agencia.id,
      amount: "47.50",
      currency: "USD",
    });

    const primera = await runSweeps(new Date());
    const segunda = await runSweeps(new Date());

    expect(
      await prisma.outboundMessage.count({
        where: { reservationId: reserva.reservationId, templateKey: "recordatorio_24h" },
      }),
    ).toBe(1);
    // El log del worker cuenta solo los mensajes nuevos, no los ya encolados.
    expect(primera.reminders24h).toBe(1);
    expect(segunda.reminders24h).toBe(0);
  });

  it("a la reserva pagada en parte le dice cuánto le falta; a la pagada, no", async () => {
    const { salida, agencia } = await createDepartureFixture({ hoursFromNow: 24 });
    const operador = await createPanelUserFixture({ agencyId: agencia.id });
    const fisico = await createPaymentMethodFixture({ kind: "FISICO" });
    // Con método físico la reserva nace en PAGO_EN_SITIO y un abono parcial no
    // la mueve de ahí; con método digital, el cobro parcial la deja ABONADA.
    const digital = await createPaymentMethodFixture({ kind: "DIGITAL" });
    const abonada = await createReservation({
      accountId: (await createAccountFixture()).id,
      departureId: salida.id,
      paymentMethodId: digital.id,
      companions: [],
      policiesAccepted: true,
    });
    await registerCashPayment({
      reservationId: abonada.reservationId,
      panelUserId: operador.id,
      agencyId: agencia.id,
      amount: "20.00",
      currency: "USD",
    });
    const pagada = await createReservation({
      accountId: (await createAccountFixture()).id,
      departureId: salida.id,
      paymentMethodId: fisico.id,
      companions: [],
      policiesAccepted: true,
    });
    await registerCashPayment({
      reservationId: pagada.reservationId,
      panelUserId: operador.id,
      agencyId: agencia.id,
      amount: "47.50",
      currency: "USD",
    });

    await runSweeps(new Date());

    const fila = await prisma.reservation.findUniqueOrThrow({ where: { id: abonada.reservationId } });
    expect(fila.status).toBe("ABONADA");
    const saldo = fila.totalUsd.sub(fila.paidUsd).toFixed(2).replace(".", ",");
    const recordatorioAbonada = await prisma.outboundMessage.findFirstOrThrow({
      where: { reservationId: abonada.reservationId, templateKey: "recordatorio_24h" },
    });
    const recordatorioPagada = await prisma.outboundMessage.findFirstOrThrow({
      where: { reservationId: pagada.reservationId, templateKey: "recordatorio_24h" },
    });
    const textoAbonada = String((recordatorioAbonada.payload as Record<string, unknown>)._texto);
    const textoPagada = String((recordatorioPagada.payload as Record<string, unknown>)._texto);
    expect(textoAbonada).toContain("Todavía te falta pagar");
    expect(textoAbonada).toContain(saldo);
    expect(textoAbonada).toContain("no recibes tu ticket");
    expect(textoPagada).not.toContain("te falta pagar");
  });
});

describe("liberación del pago en sitio a las 12 horas", () => {
  it("libera la que no reconfirmó y conserva la reconfirmada", async () => {
    const { salida } = await createDepartureFixture({ hoursFromNow: 10, capacity: 10 });
    const fisico = await createPaymentMethodFixture({ kind: "FISICO" });

    // El método físico exige 12 h de anticipación, así que se crean directo.
    const sinReconfirmar = await prisma.reservation.create({
      data: {
        code: "TR-0101-1PAX-AAAA",
        publicToken: "tok-sin",
        accountId: (await createAccountFixture()).id,
        departureId: salida.id,
        paymentMethodId: fisico.id,
        status: "PAGO_EN_SITIO",
        passengerCount: 1,
        policiesAcceptedAt: new Date(),
        fareUsd: "45.00",
        fareTotalUsd: "45.00",
        taxPerPassengerUsd: "2.50",
        taxTotalUsd: "2.50",
        totalUsd: "47.50",
        currency: "USD",
        exchangeRateUsed: "1",
        amountInCurrency: "47.50",
      },
    });
    const reconfirmada = await prisma.reservation.create({
      data: {
        code: "TR-0101-1PAX-BBBB",
        publicToken: "tok-con",
        accountId: (await createAccountFixture()).id,
        departureId: salida.id,
        paymentMethodId: fisico.id,
        status: "PAGO_EN_SITIO",
        passengerCount: 1,
        policiesAcceptedAt: new Date(),
        reconfirmedAt: new Date(),
        fareUsd: "45.00",
        fareTotalUsd: "45.00",
        taxPerPassengerUsd: "2.50",
        taxTotalUsd: "2.50",
        totalUsd: "47.50",
        currency: "USD",
        exchangeRateUsed: "1",
        amountInCurrency: "47.50",
      },
    });

    const resultado = await runSweeps(new Date());

    expect(resultado.released12h).toBe(1);
    expect(
      (await prisma.reservation.findUniqueOrThrow({ where: { id: sinReconfirmar.id } })).status,
    ).toBe("LIBERADA");
    expect(
      (await prisma.reservation.findUniqueOrThrow({ where: { id: reconfirmada.id } })).status,
    ).toBe("PAGO_EN_SITIO");
  });

  it("nunca libera una reserva ya pagada", async () => {
    const { salida, agencia } = await createDepartureFixture({ hoursFromNow: 10, capacity: 10 });
    const operador = await createPanelUserFixture({ agencyId: agencia.id });
    const fisico = await createPaymentMethodFixture({ kind: "FISICO" });

    const pagada = await prisma.reservation.create({
      data: {
        code: "TR-0101-1PAX-CCCC",
        publicToken: "tok-pagada",
        accountId: (await createAccountFixture()).id,
        departureId: salida.id,
        paymentMethodId: fisico.id,
        status: "PAGO_EN_SITIO",
        passengerCount: 1,
        policiesAcceptedAt: new Date(),
        fareUsd: "45.00",
        fareTotalUsd: "45.00",
        taxPerPassengerUsd: "2.50",
        taxTotalUsd: "2.50",
        totalUsd: "47.50",
        currency: "USD",
        exchangeRateUsed: "1",
        amountInCurrency: "47.50",
      },
    });
    await registerCashPayment({
      reservationId: pagada.id,
      panelUserId: operador.id,
      agencyId: agencia.id,
      amount: "47.50",
      currency: "USD",
    });

    await runSweeps(new Date());

    expect(
      (await prisma.reservation.findUniqueOrThrow({ where: { id: pagada.id } })).status,
    ).toBe("PAGADA");
  });

  it("al liberar avisa al primero de la lista de espera que quepa", async () => {
    const { salida } = await createDepartureFixture({ hoursFromNow: 10, capacity: 1 });
    const fisico = await createPaymentMethodFixture({ kind: "FISICO" });

    await prisma.reservation.create({
      data: {
        code: "TR-0101-1PAX-DDDD",
        publicToken: "tok-libera",
        accountId: (await createAccountFixture()).id,
        departureId: salida.id,
        paymentMethodId: fisico.id,
        status: "PAGO_EN_SITIO",
        passengerCount: 1,
        policiesAcceptedAt: new Date(),
        fareUsd: "45.00",
        fareTotalUsd: "45.00",
        taxPerPassengerUsd: "2.50",
        taxTotalUsd: "2.50",
        totalUsd: "47.50",
        currency: "USD",
        exchangeRateUsed: "1",
        amountInCurrency: "47.50",
      },
    });

    const grande = await createAccountFixture();
    const pequena = await createAccountFixture();
    await joinWaitlist({ departureId: salida.id, accountId: grande.id, passengerCount: 4 });
    const esperada = await joinWaitlist({
      departureId: salida.id,
      accountId: pequena.id,
      passengerCount: 1,
    });

    await runSweeps(new Date());

    const entrada = await prisma.waitlistEntry.findUniqueOrThrow({
      where: { id: esperada.entryId },
    });
    expect(entrada.status).toBe("NOTIFICADO");
    expect(entrada.claimToken).not.toBeNull();
  });
});

describe("entrega de mensajes", () => {
  it("envía los mensajes encolados y los marca como enviados", async () => {
    const { salida } = await createDepartureFixture();
    const metodo = await createPaymentMethodFixture({ kind: "DIGITAL" });
    const cuenta = await createAccountFixture();
    await createReservation({
      accountId: cuenta.id,
      departureId: salida.id,
      paymentMethodId: metodo.id,
      companions: [],
      policiesAccepted: true,
    });

    const resultado = await deliverPendingMessages(new Date());
    expect(resultado.sent).toBe(1);
    expect(getFakeProvider().sent).toHaveLength(1);
    expect(
      await prisma.outboundMessage.count({ where: { status: "ENVIADO" } }),
    ).toBe(1);
  });

  it("reprograma con espera creciente tras un fallo", async () => {
    const { salida } = await createDepartureFixture();
    const metodo = await createPaymentMethodFixture({ kind: "DIGITAL" });
    const cuenta = await createAccountFixture();
    await createReservation({
      accountId: cuenta.id,
      departureId: salida.id,
      paymentMethodId: metodo.id,
      companions: [],
      policiesAccepted: true,
    });

    // El reloj de prueba debe ir por delante de la creación del mensaje.
    const ahora = new Date(Date.now() + 1_000);
    getFakeProvider().failNextN(1);
    await deliverPendingMessages(ahora);

    const mensaje = await prisma.outboundMessage.findFirstOrThrow({});
    expect(mensaje.status).toBe("ENCOLADO");
    expect(mensaje.attempts).toBe(1);
    expect(mensaje.scheduledFor.getTime()).toBe(ahora.getTime() + 60_000);
    expect(mensaje.lastError).toMatch(/Fallo simulado/);
  });

  it("tras cinco fallos marca la reserva para contacto manual", async () => {
    const { salida } = await createDepartureFixture();
    const metodo = await createPaymentMethodFixture({ kind: "DIGITAL" });
    const cuenta = await createAccountFixture();
    const reserva = await createReservation({
      accountId: cuenta.id,
      departureId: salida.id,
      paymentMethodId: metodo.id,
      companions: [],
      policiesAccepted: true,
    });

    getFakeProvider().failNextN(5);
    let reloj = new Date(Date.now() + 1_000);
    for (let i = 0; i < 5; i += 1) {
      await deliverPendingMessages(reloj);
      reloj = new Date(reloj.getTime() + 400 * 60_000);
    }

    const mensaje = await prisma.outboundMessage.findFirstOrThrow({});
    expect(mensaje.status).toBe("FALLIDO");
    expect(mensaje.attempts).toBe(5);
    expect(
      (await prisma.reservation.findUniqueOrThrow({ where: { id: reserva.reservationId } }))
        .manualContactRequired,
    ).toBe(true);
  });

  it("no toma un mensaje cuya hora programada aún no llegó", async () => {
    const { salida } = await createDepartureFixture();
    const metodo = await createPaymentMethodFixture({ kind: "DIGITAL" });
    const cuenta = await createAccountFixture();
    await createReservation({
      accountId: cuenta.id,
      departureId: salida.id,
      paymentMethodId: metodo.id,
      companions: [],
      policiesAccepted: true,
    });
    await prisma.outboundMessage.updateMany({
      data: { scheduledFor: new Date(Date.now() + 3_600_000) },
    });

    const resultado = await deliverPendingMessages(new Date());
    expect(resultado.sent).toBe(0);
  });
});

describe("cierre automático de manifiestos", () => {
  it("cierra las salidas que ya partieron y seguían programadas", async () => {
    const { salida } = await createDepartureFixture({ hoursFromNow: 72 });
    await prisma.departure.update({
      where: { id: salida.id },
      data: { departsAt: new Date(Date.now() - 3_600_000) },
    });

    const resultado = await runSweeps(new Date());
    expect(resultado.departuresClosed).toBe(1);
    expect(
      (await prisma.departure.findUniqueOrThrow({ where: { id: salida.id } })).status,
    ).toBe("MANIFIESTO_CERRADO");
  });
});
