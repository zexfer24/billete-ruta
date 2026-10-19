import { randomUUID } from "node:crypto";
import type { DocumentType, ReservationStatus } from "@prisma/client";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  getPassengerProfile,
  listTravelHistoryByIdNumber,
} from "@/modules/reports";
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

const HORA = 3_600_000;

interface ReservationOptions {
  accountId: string;
  departureId: string;
  paymentMethodId: string;
  status?: ReservationStatus;
  paidUsd?: string;
  withTicket?: boolean;
  /** Cédulas y nombres de los acompañantes, además del titular. */
  companions?: Array<{ idNumber: string; fullName: string; boardedAt?: Date | null }>;
  holder: { idNumber: string; fullName: string; boardedAt?: Date | null };
  createdAt?: Date;
}

/** Reserva armada directo con Prisma, sin pasar por el dominio de reservas. */
async function reservationFixture(options: ReservationOptions) {
  const sufijo = randomUUID().slice(0, 4).toUpperCase();
  const acompanantes = options.companions ?? [];
  const cantidad = 1 + acompanantes.length;
  const reserva = await prisma.reservation.create({
    data: {
      code: `TR-1019-${cantidad}PAX-${sufijo}`,
      publicToken: randomUUID(),
      accountId: options.accountId,
      departureId: options.departureId,
      paymentMethodId: options.paymentMethodId,
      status: options.status ?? "PAGADA",
      passengerCount: cantidad,
      policiesAcceptedAt: new Date(),
      fareUsd: "45.00",
      fareTotalUsd: String(45 * cantidad),
      taxPerPassengerUsd: "2.50",
      taxTotalUsd: String(2.5 * cantidad),
      totalUsd: String(47.5 * cantidad),
      paidUsd: options.paidUsd ?? String(47.5 * cantidad),
      currency: "USD",
      exchangeRateUsed: "1",
      amountInCurrency: String(47.5 * cantidad),
      createdAt: options.createdAt,
      passengers: {
        create: [
          {
            fullName: options.holder.fullName,
            idNumber: options.holder.idNumber,
            birthYear: 1990,
            isHolder: true,
            boardedAt: options.holder.boardedAt ?? null,
          },
          ...acompanantes.map((c) => ({
            fullName: c.fullName,
            idNumber: c.idNumber,
            birthYear: 1995,
            isHolder: false,
            boardedAt: c.boardedAt ?? null,
          })),
        ],
      },
    },
  });
  if (options.withTicket !== false && (options.status ?? "PAGADA") !== "LIBERADA") {
    await prisma.ticket.create({
      data: { reservationId: reserva.id, pdfPath: "tickets/x.pdf", qrPayload: "qr" },
    });
  }
  return reserva;
}

async function documentFixture(
  accountId: string,
  type: DocumentType,
  name: string,
  uploadedAt: Date,
) {
  return prisma.passengerDocument.create({
    data: { accountId, type, filePath: `documentos/${accountId}/${name}`, originalName: name, uploadedAt },
  });
}

describe("getPassengerProfile", () => {
  it("devuelve null para un id inexistente y no audita", async () => {
    const admin = await createPanelUserFixture({ role: "ADMIN" });
    const perfil = await getPassengerProfile(randomUUID(), admin.id);
    expect(perfil).toBeNull();
    expect(await prisma.auditLog.count({ where: { action: "CONSULTA_PERFIL_PASAJERO" } })).toBe(0);
  });

  it("datos de la cuenta: origen por app, activada y sin exponer el hash", async () => {
    const admin = await createPanelUserFixture({ role: "ADMIN" });
    const cuenta = await createAccountFixture({ birthYear: 1990 });
    const perfil = await getPassengerProfile(cuenta.id, admin.id);
    expect(perfil).not.toBeNull();
    expect(perfil!.account.idNumber).toBe(cuenta.idNumber);
    expect(perfil!.account.createdVia).toBe("APP");
    expect(perfil!.account.createdByName).toBeNull();
    expect(perfil!.account.activated).toBe(true);
    expect(perfil!.account.age).toBeGreaterThanOrEqual(35);
    expect(JSON.stringify(perfil)).not.toContain("passwordHash");
  });

  it("cuenta de taquilla: origen TAQUILLA, nombre del operador y sin activar", async () => {
    const admin = await createPanelUserFixture({ role: "ADMIN" });
    const { agencia } = await createDepartureFixture({});
    const operador = await createPanelUserFixture({ agencyId: agencia.id });
    const cuenta = await createAccountFixture();
    await prisma.passengerAccount.update({
      where: { id: cuenta.id },
      data: { passwordHash: null, createdByPanelUserId: operador.id },
    });
    const perfil = await getPassengerProfile(cuenta.id, admin.id);
    expect(perfil!.account.createdVia).toBe("TAQUILLA");
    expect(perfil!.account.createdByName).toBe(operador.name);
    expect(perfil!.account.activated).toBe(false);
  });

  it("documentos: vigente y anteriores por tipo, incluida FOTO_PERFIL", async () => {
    const admin = await createPanelUserFixture({ role: "ADMIN" });
    const cuenta = await createAccountFixture({ withCedula: false });
    const t0 = new Date("2026-08-01T12:00:00Z");
    await documentFixture(cuenta.id, "FOTO_PERFIL", "foto-vieja.png", t0);
    const fotoNueva = await documentFixture(
      cuenta.id,
      "FOTO_PERFIL",
      "foto-nueva.png",
      new Date(t0.getTime() + 5 * HORA),
    );
    await documentFixture(cuenta.id, "CEDULA", "cedula-1.png", t0);
    await documentFixture(cuenta.id, "CEDULA", "cedula-2.png", new Date(t0.getTime() + HORA));
    await documentFixture(cuenta.id, "CEDULA", "cedula-3.png", new Date(t0.getTime() + 2 * HORA));
    await documentFixture(cuenta.id, "PERMISO_VIAJE", "permiso-a.png", t0);
    await documentFixture(cuenta.id, "PERMISO_VIAJE", "permiso-b.png", new Date(t0.getTime() + HORA));

    const perfil = await getPassengerProfile(cuenta.id, admin.id);
    const { profilePhoto, cedula, travelPermits } = perfil!.documents;
    expect(profilePhoto.current?.id).toBe(fotoNueva.id);
    expect(profilePhoto.previous.map((d) => d.originalName)).toEqual(["foto-vieja.png"]);
    expect(cedula.current?.originalName).toBe("cedula-3.png");
    expect(cedula.previous.map((d) => d.originalName)).toEqual(["cedula-2.png", "cedula-1.png"]);
    expect(travelPermits.map((d) => d.originalName)).toEqual(["permiso-b.png", "permiso-a.png"]);
  });

  it("documentos ausentes: grupos vacíos", async () => {
    const admin = await createPanelUserFixture({ role: "ADMIN" });
    const cuenta = await createAccountFixture({ withCedula: false });
    const perfil = await getPassengerProfile(cuenta.id, admin.id);
    expect(perfil!.documents.profilePhoto).toEqual({ current: null, previous: [] });
    expect(perfil!.documents.cedula).toEqual({ current: null, previous: [] });
    expect(perfil!.documents.travelPermits).toEqual([]);
  });

  it("historial como titular con ruta, agencia, placa, chofer, ticket y llegada", async () => {
    const admin = await createPanelUserFixture({ role: "ADMIN" });
    const cuenta = await createAccountFixture();
    const metodo = await createPaymentMethodFixture({ kind: "FISICO" });
    const reciente = await createDepartureFixture({ hoursFromNow: -48 });
    const antigua = await createDepartureFixture({ hoursFromNow: -200 });
    const departedAt = new Date(Date.now() - 47 * HORA);
    const arrivedAt = new Date(Date.now() - 40 * HORA);
    await prisma.tripLog.create({
      data: {
        departureId: reciente.salida.id,
        driverId: reciente.chofer.id,
        vehicleId: reciente.vehiculo.id,
        departedAt,
        arrivedAt,
      },
    });
    const boardedAt = new Date(Date.now() - 47.5 * HORA);

    await reservationFixture({
      accountId: cuenta.id,
      departureId: antigua.salida.id,
      paymentMethodId: metodo.id,
      status: "LIBERADA",
      paidUsd: "0",
      holder: { idNumber: cuenta.idNumber, fullName: cuenta.fullName },
    });
    const abordada = await reservationFixture({
      accountId: cuenta.id,
      departureId: reciente.salida.id,
      paymentMethodId: metodo.id,
      status: "ABORDADA",
      holder: { idNumber: cuenta.idNumber, fullName: cuenta.fullName, boardedAt },
    });

    const perfil = await getPassengerProfile(cuenta.id, admin.id);
    expect(perfil!.trips).toHaveLength(2);
    const [primera, segunda] = perfil!.trips;
    expect(primera!.reservationId).toBe(abordada.id);
    expect(primera!.origin).toBe("Caracas");
    expect(primera!.destination).toBe(reciente.ruta.destination);
    expect(primera!.agencyId).toBe(reciente.agencia.id);
    expect(primera!.agencyName).toBe(reciente.agencia.name);
    expect(primera!.vehiclePlate).toBe(reciente.vehiculo.plate);
    expect(primera!.driverName).toBe(reciente.chofer.fullName);
    expect(primera!.status).toBe("ABORDADA");
    expect(primera!.salesChannel).toBe("APP");
    expect(primera!.ticketIssuedAt).toBeInstanceOf(Date);
    expect(primera!.boardedAt?.getTime()).toBe(boardedAt.getTime());
    expect(primera!.departedAt?.getTime()).toBe(departedAt.getTime());
    expect(primera!.arrivedAt?.getTime()).toBe(arrivedAt.getTime());
    expect(primera!.paidUsd.toFixed(2)).toBe("47.50");
    expect(segunda!.status).toBe("LIBERADA");
    expect(segunda!.ticketIssuedAt).toBeNull();
    expect(segunda!.arrivedAt).toBeNull();
  });

  it("viaje como acompañante en la reserva de otra cuenta", async () => {
    const admin = await createPanelUserFixture({ role: "ADMIN" });
    const titular = await createAccountFixture({ givenNames: "Lucía", surnames: "Pérez" });
    const acompanante = await createAccountFixture();
    const metodo = await createPaymentMethodFixture({ kind: "FISICO" });
    const { salida, ruta, agencia } = await createDepartureFixture({ hoursFromNow: -24 });
    const boardedAt = new Date(Date.now() - 24 * HORA);
    const reserva = await reservationFixture({
      accountId: titular.id,
      departureId: salida.id,
      paymentMethodId: metodo.id,
      status: "ABORDADA",
      holder: { idNumber: titular.idNumber, fullName: titular.fullName },
      companions: [{ idNumber: acompanante.idNumber, fullName: acompanante.fullName, boardedAt }],
    });

    const perfil = await getPassengerProfile(acompanante.id, admin.id);
    expect(perfil!.trips).toHaveLength(0);
    expect(perfil!.companionTrips).toHaveLength(1);
    const viaje = perfil!.companionTrips[0]!;
    expect(viaje.reservationId).toBe(reserva.id);
    expect(viaje.code).toBe(reserva.code);
    expect(viaje.holderAccountId).toBe(titular.id);
    expect(viaje.holderName).toBe(titular.fullName);
    expect(viaje.destination).toBe(ruta.destination);
    expect(viaje.agencyId).toBe(agencia.id);
    expect(viaje.boardedAt?.getTime()).toBe(boardedAt.getTime());
    expect(perfil!.summary.completedTrips).toBe(1);
    expect(perfil!.summary.totalReservations).toBe(0);

    // El titular no se ve a sí mismo como acompañante.
    const perfilTitular = await getPassengerProfile(titular.id, admin.id);
    expect(perfilTitular!.companionTrips).toHaveLength(0);
    expect(perfilTitular!.trips).toHaveLength(1);
  });

  it("pagos de comprobante y efectivo mezclados, el más reciente primero", async () => {
    const admin = await createPanelUserFixture({ role: "ADMIN" });
    const cuenta = await createAccountFixture();
    const digital = await createPaymentMethodFixture({ kind: "DIGITAL", currency: "VES" });
    const fisico = await createPaymentMethodFixture({ kind: "FISICO", currency: "USD" });
    const { salida, agencia } = await createDepartureFixture({});
    const operador = await createPanelUserFixture({ agencyId: agencia.id });
    const reserva = await reservationFixture({
      accountId: cuenta.id,
      departureId: salida.id,
      paymentMethodId: fisico.id,
      holder: { idNumber: cuenta.idNumber, fullName: cuenta.fullName },
    });

    const t0 = new Date(Date.now() - 10 * HORA);
    const comprobante = await prisma.paymentProof.create({
      data: {
        reservationId: reserva.id,
        paymentMethodId: digital.id,
        reference: "REF-1",
        imagePath: "comprobantes/x.png",
        amount: "1000.00",
        currency: "VES",
        amountUsd: "27.22",
        status: "APROBADO",
        createdAt: t0,
      },
    });
    const efectivo = await prisma.cashPayment.create({
      data: {
        reservationId: reserva.id,
        amount: "20.28",
        currency: "USD",
        amountUsd: "20.28",
        collectedByPanelUserId: operador.id,
        collectedAt: new Date(t0.getTime() + 2 * HORA),
      },
    });
    const rechazado = await prisma.paymentProof.create({
      data: {
        reservationId: reserva.id,
        paymentMethodId: digital.id,
        reference: "REF-0",
        imagePath: "comprobantes/y.png",
        amount: "500.00",
        currency: "VES",
        amountUsd: "13.61",
        status: "RECHAZADO",
        createdAt: new Date(t0.getTime() - HORA),
      },
    });

    const perfil = await getPassengerProfile(cuenta.id, admin.id);
    expect(perfil!.payments.map((p) => p.id)).toEqual([efectivo.id, comprobante.id, rechazado.id]);
    const [pagoEfectivo, pagoDigital, pagoRechazado] = perfil!.payments;
    expect(pagoEfectivo!.kind).toBe("EFECTIVO");
    expect(pagoEfectivo!.status).toBe("COBRADO");
    expect(pagoEfectivo!.methodName).toBe(fisico.name);
    expect(pagoEfectivo!.reservationCode).toBe(reserva.code);
    expect(pagoDigital!.kind).toBe("COMPROBANTE");
    expect(pagoDigital!.status).toBe("APROBADO");
    expect(pagoDigital!.methodName).toBe(digital.name);
    expect(pagoDigital!.currency).toBe("VES");
    expect(pagoDigital!.amountUsd.toFixed(2)).toBe("27.22");
    expect(pagoRechazado!.status).toBe("RECHAZADO");
  });

  it("resumen coherente con el historial", async () => {
    const admin = await createPanelUserFixture({ role: "ADMIN" });
    const cuenta = await createAccountFixture();
    const otra = await createAccountFixture();
    const metodo = await createPaymentMethodFixture({ kind: "FISICO" });
    const a = await createDepartureFixture({ hoursFromNow: -100 });
    const b = await createDepartureFixture({ hoursFromNow: -80 });
    const c = await createDepartureFixture({ hoursFromNow: -60 });
    const d = await createDepartureFixture({ hoursFromNow: -40 });

    const titular = { idNumber: cuenta.idNumber, fullName: cuenta.fullName };
    await reservationFixture({
      accountId: cuenta.id,
      departureId: a.salida.id,
      paymentMethodId: metodo.id,
      status: "ABORDADA",
      holder: { ...titular, boardedAt: new Date() },
    });
    await reservationFixture({
      accountId: cuenta.id,
      departureId: b.salida.id,
      paymentMethodId: metodo.id,
      status: "NO_SHOW",
      holder: titular,
    });
    await reservationFixture({
      accountId: cuenta.id,
      departureId: c.salida.id,
      paymentMethodId: metodo.id,
      status: "CANCELADA",
      paidUsd: "0",
      withTicket: false,
      holder: titular,
    });
    await reservationFixture({
      accountId: otra.id,
      departureId: d.salida.id,
      paymentMethodId: metodo.id,
      status: "ABORDADA",
      holder: { idNumber: otra.idNumber, fullName: otra.fullName },
      companions: [{ idNumber: cuenta.idNumber, fullName: cuenta.fullName, boardedAt: new Date() }],
    });

    const { summary } = (await getPassengerProfile(cuenta.id, admin.id))!;
    expect(summary.totalReservations).toBe(3);
    expect(summary.paidTickets).toBe(2);
    expect(summary.completedTrips).toBe(2);
    expect(summary.noShows).toBe(1);
    expect(summary.releasedOrCancelled).toBe(1);
    expect(summary.totalPaidUsd.toFixed(2)).toBe("95.00");
    // Viajes: la abordada, el no-show con ticket y el acompañamiento.
    expect(summary.distinctDestinations).toBe(3);
    expect(summary.distinctAgencies).toBe(3);
    expect(summary.distinctOrigins).toBe(1);
    expect(summary.topDestinations).toHaveLength(3);
  });

  it("escribe la auditoría CONSULTA_PERFIL_PASAJERO", async () => {
    const admin = await createPanelUserFixture({ role: "ADMIN" });
    const cuenta = await createAccountFixture();
    const metodo = await createPaymentMethodFixture({ kind: "FISICO" });
    const { salida } = await createDepartureFixture({});
    await reservationFixture({
      accountId: cuenta.id,
      departureId: salida.id,
      paymentMethodId: metodo.id,
      holder: { idNumber: cuenta.idNumber, fullName: cuenta.fullName },
    });

    await getPassengerProfile(cuenta.id, admin.id);
    const entradas = await prisma.auditLog.findMany({
      where: { action: "CONSULTA_PERFIL_PASAJERO" },
    });
    expect(entradas).toHaveLength(1);
    expect(entradas[0]!.actorType).toBe("PANEL");
    expect(entradas[0]!.actorPanelUserId).toBe(admin.id);
    expect(entradas[0]!.entityType).toBe("PassengerAccount");
    expect(entradas[0]!.entityId).toBe(cuenta.id);
    expect(entradas[0]!.after).toEqual({ reservas: 1 });
  });
});

describe("listTravelHistoryByIdNumber", () => {
  it("une titular, acompañante y chofer, con la cédula escrita con puntos o guiones", async () => {
    const cuenta = await createAccountFixture();
    const otra = await createAccountFixture();
    const metodo = await createPaymentMethodFixture({ kind: "FISICO" });
    const comoTitular = await createDepartureFixture({ hoursFromNow: -100 });
    const comoAcompanante = await createDepartureFixture({ hoursFromNow: -50 });
    const comoChofer = await createDepartureFixture({ hoursFromNow: -10 });

    // La cédula del chofer de la tercera salida pasa a ser la de la cuenta.
    await prisma.driver.update({
      where: { id: comoChofer.chofer.id },
      data: { idNumber: cuenta.idNumber },
    });
    await prisma.tripLog.create({
      data: {
        departureId: comoChofer.salida.id,
        driverId: comoChofer.chofer.id,
        vehicleId: comoChofer.vehiculo.id,
        departedAt: new Date(Date.now() - 9 * HORA),
        arrivedAt: new Date(Date.now() - 2 * HORA),
      },
    });

    const reservaTitular = await reservationFixture({
      accountId: cuenta.id,
      departureId: comoTitular.salida.id,
      paymentMethodId: metodo.id,
      holder: { idNumber: cuenta.idNumber, fullName: cuenta.fullName },
    });
    const reservaAjena = await reservationFixture({
      accountId: otra.id,
      departureId: comoAcompanante.salida.id,
      paymentMethodId: metodo.id,
      holder: { idNumber: otra.idNumber, fullName: otra.fullName },
      companions: [{ idNumber: cuenta.idNumber, fullName: cuenta.fullName }],
    });

    const numero = cuenta.idNumber; // p. ej. V12345678
    const conPuntos = `${numero.slice(0, 1)}-${numero.slice(1, 3)}.${numero.slice(3, 6)}.${numero.slice(6)}`;
    const filas = await listTravelHistoryByIdNumber(conPuntos.toLowerCase());

    expect(filas.map((f) => f.role)).toEqual(["CHOFER", "ACOMPANANTE", "TITULAR"]);
    const [chofer, acompanante, titular] = filas;
    expect(chofer!.reservationId).toBeNull();
    expect(chofer!.code).toBeNull();
    expect(chofer!.departureId).toBe(comoChofer.salida.id);
    expect(chofer!.status).toBe("PROGRAMADA");
    expect(chofer!.vehiclePlate).toBe(comoChofer.vehiculo.plate);
    expect(chofer!.arrivedAt).toBeInstanceOf(Date);
    expect(acompanante!.reservationId).toBe(reservaAjena.id);
    expect(acompanante!.code).toBe(reservaAjena.code);
    expect(acompanante!.origin).toBe("Caracas");
    expect(acompanante!.destination).toBe(comoAcompanante.ruta.destination);
    expect(titular!.reservationId).toBe(reservaTitular.id);
    expect(titular!.status).toBe("PAGADA");
    expect(titular!.agencyName).toBe(comoTitular.agencia.name);

    // La otra cuenta solo aparece como titular de su reserva.
    const deOtra = await listTravelHistoryByIdNumber(otra.idNumber);
    expect(deOtra.map((f) => f.role)).toEqual(["TITULAR"]);
  });

  it("respeta el límite y devuelve vacío para una cédula sin historial", async () => {
    const cuenta = await createAccountFixture();
    const metodo = await createPaymentMethodFixture({ kind: "FISICO" });
    for (const horas of [-30, -20, -10]) {
      const { salida } = await createDepartureFixture({ hoursFromNow: horas });
      await reservationFixture({
        accountId: cuenta.id,
        departureId: salida.id,
        paymentMethodId: metodo.id,
        holder: { idNumber: cuenta.idNumber, fullName: cuenta.fullName },
      });
    }
    expect(await listTravelHistoryByIdNumber(cuenta.idNumber, { limit: 2 })).toHaveLength(2);
    expect(await listTravelHistoryByIdNumber("V99999999")).toEqual([]);
  });
});
