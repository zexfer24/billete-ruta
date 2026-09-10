import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { ForbiddenError } from "@/modules/auth";
import { DepartureClosedError, createReservation } from "@/modules/booking";
import { registerCashPayment } from "@/modules/payments";
import { listDrivers } from "@/modules/agencies";
import { signTicketCode } from "@/modules/tickets";
import {
  confirmBoarding,
  findForBoarding,
  registerArrival,
  registerDeparture,
  startBoarding,
} from "@/modules/trips";
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

async function escenario() {
  const { salida, agencia, chofer } = await createDepartureFixture({ capacity: 20 });
  const operador = await createPanelUserFixture({ agencyId: agencia.id });
  const digital = await createPaymentMethodFixture({ kind: "DIGITAL", currency: "USD" });
  const fisico = await createPaymentMethodFixture({ kind: "FISICO", currency: "USD" });
  return { salida, agencia, chofer, operador, digital, fisico };
}

async function reservaPagada(
  salidaId: string,
  metodoFisicoId: string,
  agencyId: string,
  panelUserId: string,
) {
  const cuenta = await createAccountFixture();
  const reserva = await createReservation({
    accountId: cuenta.id,
    departureId: salidaId,
    paymentMethodId: metodoFisicoId,
    companions: [],
    policiesAccepted: true,
  });
  await registerCashPayment({
    reservationId: reserva.reservationId,
    panelUserId,
    agencyId,
    amount: "47.50",
    currency: "USD",
  });
  return reserva;
}

describe("embarque y desembarque", () => {
  it("iniciar el embarque cierra el manifiesto y bloquea reservas nuevas", async () => {
    const { salida, agencia, operador, digital } = await escenario();

    await startBoarding({
      departureId: salida.id,
      panelUserId: operador.id,
      agencyId: agencia.id,
    });

    const fila = await prisma.departure.findUniqueOrThrow({ where: { id: salida.id } });
    expect(fila.status).toBe("MANIFIESTO_CERRADO");
    expect(fila.manifestClosedByPanelUserId).toBe(operador.id);

    const cuenta = await createAccountFixture();
    await expect(
      createReservation({
        accountId: cuenta.id,
        departureId: salida.id,
        paymentMethodId: digital.id,
        companions: [],
        policiesAccepted: true,
      }),
    ).rejects.toThrow(DepartureClosedError);
  });

  it("iniciar el embarque dos veces no crea dos registros de viaje", async () => {
    const { salida, agencia, operador } = await escenario();
    await startBoarding({ departureId: salida.id, panelUserId: operador.id, agencyId: agencia.id });
    await startBoarding({ departureId: salida.id, panelUserId: operador.id, agencyId: agencia.id });
    expect(await prisma.tripLog.count({ where: { departureId: salida.id } })).toBe(1);
  });

  it("registrar la salida marca ausentes a las pagadas que no abordaron", async () => {
    const { salida, agencia, operador, fisico } = await escenario();

    const abordada = await reservaPagada(salida.id, fisico.id, agencia.id, operador.id);
    const ausente = await reservaPagada(salida.id, fisico.id, agencia.id, operador.id);

    const encontrada = await findForBoarding(salida.id, abordada.code, agencia.id);
    if (!("reservation" in encontrada)) throw new Error("No se encontró la reserva");
    await confirmBoarding({
      reservationId: encontrada.reservation.reservationId,
      passengerIds: encontrada.reservation.passengers.map((p) => p.id),
      panelUserId: operador.id,
      agencyId: agencia.id,
    });

    await startBoarding({ departureId: salida.id, panelUserId: operador.id, agencyId: agencia.id });
    const resultado = await registerDeparture({
      departureId: salida.id,
      panelUserId: operador.id,
      agencyId: agencia.id,
    });

    expect(resultado.noShows).toBe(1);
    expect(resultado.passengerCount).toBe(1);
    expect(
      (await prisma.reservation.findUniqueOrThrow({ where: { id: abordada.reservationId } })).status,
    ).toBe("ABORDADA");
    expect(
      (await prisma.reservation.findUniqueOrThrow({ where: { id: ausente.reservationId } })).status,
    ).toBe("NO_SHOW");
  });

  it("cancela las reservas de pago en sitio que nunca pagaron", async () => {
    const { salida, agencia, operador, fisico } = await escenario();
    const cuenta = await createAccountFixture();
    const impaga = await createReservation({
      accountId: cuenta.id,
      departureId: salida.id,
      paymentMethodId: fisico.id,
      companions: [],
      policiesAccepted: true,
    });

    await startBoarding({ departureId: salida.id, panelUserId: operador.id, agencyId: agencia.id });
    const resultado = await registerDeparture({
      departureId: salida.id,
      panelUserId: operador.id,
      agencyId: agencia.id,
    });

    expect(resultado.cancelled).toBe(1);
    const fila = await prisma.reservation.findUniqueOrThrow({
      where: { id: impaga.reservationId },
    });
    expect(fila.status).toBe("CANCELADA");
    expect(fila.cancellationReason).toMatch(/no completó el pago/i);
  });

  it("registrar la llegada cierra el viaje y calcula la duración", async () => {
    const { salida, agencia, operador } = await escenario();

    await startBoarding({ departureId: salida.id, panelUserId: operador.id, agencyId: agencia.id });
    const salidaHora = new Date("2026-09-10T10:00:00Z");
    await registerDeparture({
      departureId: salida.id,
      panelUserId: operador.id,
      agencyId: agencia.id,
      now: salidaHora,
    });
    const llegada = await registerArrival({
      departureId: salida.id,
      panelUserId: operador.id,
      agencyId: agencia.id,
      now: new Date("2026-09-10T14:35:00Z"),
    });

    expect(llegada.durationMinutes).toBe(275);
    const fila = await prisma.departure.findUniqueOrThrow({ where: { id: salida.id } });
    expect(fila.status).toBe("FINALIZADA");
  });

  it("no permite registrar la llegada antes que la salida", async () => {
    const { salida, agencia, operador } = await escenario();
    await startBoarding({ departureId: salida.id, panelUserId: operador.id, agencyId: agencia.id });
    await expect(
      registerArrival({ departureId: salida.id, panelUserId: operador.id, agencyId: agencia.id }),
    ).rejects.toThrow(/registrar la salida/i);
  });

  it("un operador de otra agencia no puede operar la salida", async () => {
    const { salida } = await escenario();
    const otra = await createAgencyFixture();
    const intruso = await createPanelUserFixture({ agencyId: otra.id });

    await expect(
      startBoarding({ departureId: salida.id, panelUserId: intruso.id, agencyId: otra.id }),
    ).rejects.toThrow(ForbiddenError);
  });

  it("cuenta los embarques y desembarques de cada chofer", async () => {
    const { salida, agencia, operador, chofer } = await escenario();

    await startBoarding({ departureId: salida.id, panelUserId: operador.id, agencyId: agencia.id });
    await registerDeparture({
      departureId: salida.id,
      panelUserId: operador.id,
      agencyId: agencia.id,
    });

    let choferes = await listDrivers(agencia.id);
    let fila = choferes.find((c) => c.id === chofer.id);
    expect(fila?.boardingCount).toBe(1);
    expect(fila?.arrivalCount).toBe(0);

    await registerArrival({
      departureId: salida.id,
      panelUserId: operador.id,
      agencyId: agencia.id,
    });

    choferes = await listDrivers(agencia.id);
    fila = choferes.find((c) => c.id === chofer.id);
    expect(fila?.arrivalCount).toBe(1);
  });
});

describe("abordaje", () => {
  it("encuentra la reserva por serial escrito y por código QR válido", async () => {
    const { salida, agencia, operador, fisico } = await escenario();
    const reserva = await reservaPagada(salida.id, fisico.id, agencia.id, operador.id);

    const porSerial = await findForBoarding(salida.id, reserva.code, agencia.id);
    expect("reservation" in porSerial).toBe(true);

    const porQr = await findForBoarding(salida.id, signTicketCode(reserva.code), agencia.id);
    expect("reservation" in porQr).toBe(true);
  });

  it("rechaza un código QR con la firma alterada", async () => {
    const { salida, agencia, operador, fisico } = await escenario();
    const reserva = await reservaPagada(salida.id, fisico.id, agencia.id, operador.id);

    const resultado = await findForBoarding(
      salida.id,
      `${reserva.code}.AAAAAAAAAAAAAAAA`,
      agencia.id,
    );
    expect(resultado).toEqual({ error: expect.stringMatching(/inválido/i) });
  });

  it("rechaza un serial de otra salida y de otra agencia", async () => {
    const { salida, agencia, operador, fisico } = await escenario();
    const reserva = await reservaPagada(salida.id, fisico.id, agencia.id, operador.id);

    const otra = await createDepartureFixture({ agencyId: agencia.id, capacity: 10 });
    const enOtraSalida = await findForBoarding(otra.salida.id, reserva.code, agencia.id);
    expect(enOtraSalida).toEqual({ error: expect.stringMatching(/otra salida/i) });

    const otraAgencia = await createAgencyFixture();
    const desdeOtraAgencia = await findForBoarding(salida.id, reserva.code, otraAgencia.id);
    expect(desdeOtraAgencia).toEqual({ error: expect.stringMatching(/otra agencia/i) });
  });

  it("no permite abordar una reserva que no está pagada", async () => {
    const { salida, agencia, digital } = await escenario();
    const cuenta = await createAccountFixture();
    const reserva = await createReservation({
      accountId: cuenta.id,
      departureId: salida.id,
      paymentMethodId: digital.id,
      companions: [],
      policiesAccepted: true,
    });

    const resultado = await findForBoarding(salida.id, reserva.code, agencia.id);
    expect(resultado).toEqual({ error: expect.stringMatching(/PENDIENTE_PAGO/) });
  });

  it("marca abordados a los pasajeros del grupo", async () => {
    const { salida, agencia, operador, fisico } = await escenario();
    const cuenta = await createAccountFixture();
    const reserva = await createReservation({
      accountId: cuenta.id,
      departureId: salida.id,
      paymentMethodId: fisico.id,
      companions: [
        { fullName: "Uno", idNumber: "V11111111", birthYear: 1990 },
        { fullName: "Dos", idNumber: "V22222222", birthYear: 1990 },
      ],
      policiesAccepted: true,
    });
    await registerCashPayment({
      reservationId: reserva.reservationId,
      panelUserId: operador.id,
      agencyId: agencia.id,
      amount: "142.50",
      currency: "USD",
    });

    const encontrada = await findForBoarding(salida.id, reserva.code, agencia.id);
    if (!("reservation" in encontrada)) throw new Error("No se encontró la reserva");
    expect(encontrada.reservation.passengers).toHaveLength(3);

    await confirmBoarding({
      reservationId: reserva.reservationId,
      passengerIds: encontrada.reservation.passengers.map((p) => p.id),
      panelUserId: operador.id,
      agencyId: agencia.id,
    });

    const fila = await prisma.reservation.findUniqueOrThrow({
      where: { id: reserva.reservationId },
      include: { passengers: true },
    });
    expect(fila.status).toBe("ABORDADA");
    expect(fila.passengers.every((p) => p.boardedAt !== null)).toBe(true);
  });
});
