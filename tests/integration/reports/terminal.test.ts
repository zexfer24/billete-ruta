import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { createReservation } from "@/modules/booking";
import { registerCashPayment } from "@/modules/payments";
import {
  getTripDetail,
  listNewAccounts,
  listTerminalTrips,
  terminalTripCount,
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

/** Crea una salida completa y su TripLog con horas exactas, sin pasar por el embarque real. */
async function tripLogFixture(
  overrides: { departedAt?: Date | null; arrivedAt?: Date | null } = {},
) {
  const { salida, agencia, ruta, chofer, vehiculo } = await createDepartureFixture({});
  const tripLog = await prisma.tripLog.create({
    data: {
      departureId: salida.id,
      driverId: chofer.id,
      vehicleId: vehiculo.id,
      boardingStartedAt: overrides.departedAt ?? null,
      departedAt: overrides.departedAt ?? null,
      arrivedAt: overrides.arrivedAt ?? null,
      passengerCount: 0,
    },
  });
  return { tripLog, salida, agencia, ruta, chofer, vehiculo };
}

/** Escenario completo para getTripDetail: un abordado y un acompañante que no aborda. */
async function tripDetailScenario() {
  const admin = await createPanelUserFixture({ role: "ADMIN" });
  const { salida, agencia, ruta, chofer, vehiculo } = await createDepartureFixture({
    capacity: 20,
  });
  const operador = await createPanelUserFixture({ agencyId: agencia.id });
  const fisico = await createPaymentMethodFixture({ kind: "FISICO", currency: "USD" });

  const cuentaAbordada = await createAccountFixture();
  const reservaAbordada = await createReservation({
    accountId: cuentaAbordada.id,
    departureId: salida.id,
    paymentMethodId: fisico.id,
    companions: [],
    policiesAccepted: true,
  });
  await registerCashPayment({
    reservationId: reservaAbordada.reservationId,
    panelUserId: operador.id,
    agencyId: agencia.id,
    amount: "47.50",
    currency: "USD",
  });
  const boardedAt = new Date("2026-09-05T09:50:00Z");
  await prisma.passenger.updateMany({
    where: { reservationId: reservaAbordada.reservationId },
    data: { boardedAt },
  });

  const cuentaNoAbordada = await createAccountFixture();
  const reservaNoAbordada = await createReservation({
    accountId: cuentaNoAbordada.id,
    departureId: salida.id,
    paymentMethodId: fisico.id,
    companions: [],
    policiesAccepted: true,
  });
  await registerCashPayment({
    reservationId: reservaNoAbordada.reservationId,
    panelUserId: operador.id,
    agencyId: agencia.id,
    amount: "47.50",
    currency: "USD",
  });
  // reservaNoAbordada se queda sin boardedAt a propósito.

  const departedAt = new Date("2026-09-05T10:00:00Z");
  const arrivedAt = new Date("2026-09-05T18:35:00Z");
  const tripLog = await prisma.tripLog.create({
    data: {
      departureId: salida.id,
      driverId: chofer.id,
      vehicleId: vehiculo.id,
      boardingStartedAt: new Date("2026-09-05T09:40:00Z"),
      departedAt,
      arrivedAt,
      passengerCount: 1,
    },
  });

  return {
    admin,
    agencia,
    ruta,
    chofer,
    vehiculo,
    salida,
    tripLog,
    reservaAbordada,
    reservaNoAbordada,
    boardedAt,
    departedAt,
    arrivedAt,
  };
}

describe("listTerminalTrips", () => {
  it("excluye viajes fuera de ventana o sin llegada, ordena por llegada descendente y el total coincide con terminalTripCount", async () => {
    const from = new Date("2026-09-01T00:00:00Z");
    const to = new Date("2026-09-10T23:59:59Z");

    const dentro1 = await tripLogFixture({
      departedAt: new Date("2026-09-05T10:00:00Z"),
      arrivedAt: new Date("2026-09-05T14:00:00Z"),
    });
    const dentro2 = await tripLogFixture({
      departedAt: new Date("2026-09-07T10:00:00Z"),
      arrivedAt: new Date("2026-09-07T14:00:00Z"),
    });
    await tripLogFixture({
      departedAt: new Date("2026-09-15T10:00:00Z"),
      arrivedAt: new Date("2026-09-15T14:00:00Z"), // fuera de la ventana
    });
    await tripLogFixture({
      departedAt: new Date("2026-09-06T10:00:00Z"),
      arrivedAt: null, // sin desembarque, no cuenta
    });

    const resultado = await listTerminalTrips(from, to);
    const total = await terminalTripCount(from, to);

    expect(resultado.total).toBe(total);
    expect(resultado.total).toBe(2);
    expect(resultado.rows.map((r) => r.tripLogId)).toEqual([
      dentro2.tripLog.id,
      dentro1.tripLog.id,
    ]);
    expect(resultado.rows[0]).toMatchObject({
      arrivedAt: new Date("2026-09-07T14:00:00Z"),
      origin: dentro2.ruta.origin,
      meetingPoint: dentro2.ruta.meetingPoint,
      destination: dentro2.ruta.destination,
      agencyName: dentro2.agencia.name,
    });
  });

  it("respeta el límite sin afectar el total", async () => {
    const from = new Date("2026-09-01T00:00:00Z");
    const to = new Date("2026-09-10T23:59:59Z");

    await tripLogFixture({
      departedAt: new Date("2026-09-02T10:00:00Z"),
      arrivedAt: new Date("2026-09-02T14:00:00Z"),
    });
    await tripLogFixture({
      departedAt: new Date("2026-09-04T10:00:00Z"),
      arrivedAt: new Date("2026-09-04T14:00:00Z"),
    });
    await tripLogFixture({
      departedAt: new Date("2026-09-06T10:00:00Z"),
      arrivedAt: new Date("2026-09-06T14:00:00Z"),
    });

    const resultado = await listTerminalTrips(from, to, { limit: 2 });

    expect(resultado.total).toBe(3);
    expect(resultado.rows).toHaveLength(2);
  });

  it("el límite se aplica por llegada: un viaje largo que salió antes pero llegó último entra, uno corto que llegó antes queda fuera", async () => {
    const from = new Date("2026-09-01T00:00:00Z");
    const to = new Date("2026-09-10T23:59:59Z");

    // Sale primero y llega último: 14 horas de corredor.
    const largo = await tripLogFixture({
      departedAt: new Date("2026-09-05T00:00:00Z"),
      arrivedAt: new Date("2026-09-05T14:00:00Z"),
    });
    // Salen después, pero el primero llega antes que el largo.
    const cortoTemprano = await tripLogFixture({
      departedAt: new Date("2026-09-05T08:00:00Z"),
      arrivedAt: new Date("2026-09-05T10:00:00Z"),
    });
    const cortoTarde = await tripLogFixture({
      departedAt: new Date("2026-09-05T12:00:00Z"),
      arrivedAt: new Date("2026-09-05T13:00:00Z"),
    });

    const resultado = await listTerminalTrips(from, to, { limit: 2 });

    expect(resultado.total).toBe(3);
    expect(resultado.rows.map((r) => r.tripLogId)).toEqual([largo.tripLog.id, cortoTarde.tripLog.id]);
    expect(resultado.rows.map((r) => r.tripLogId)).not.toContain(cortoTemprano.tripLog.id);
    expect(resultado.rows[0]?.arrivedAt).toEqual(new Date("2026-09-05T14:00:00Z"));
  });
});

describe("listNewAccounts", () => {
  it("excluye cuentas fuera de rango y calcula primer nombre y primer apellido con partículas", async () => {
    const admin = await createPanelUserFixture({ role: "ADMIN" });
    const from = new Date("2026-09-01T00:00:00Z");
    const to = new Date("2026-09-10T23:59:59Z");

    const dentro = await createAccountFixture({
      givenNames: "María José",
      surnames: "de la Cruz Pérez",
    });
    await prisma.passengerAccount.update({
      where: { id: dentro.id },
      data: { createdAt: new Date("2026-09-05T12:00:00Z") },
    });

    const fuera = await createAccountFixture();
    await prisma.passengerAccount.update({
      where: { id: fuera.id },
      data: { createdAt: new Date("2026-08-01T12:00:00Z") },
    });

    const resultado = await listNewAccounts(from, to, admin.id);

    expect(resultado.total).toBe(1);
    expect(resultado.rows).toHaveLength(1);
    expect(resultado.rows[0]).toMatchObject({
      id: dentro.id,
      idNumber: dentro.idNumber,
      firstName: "María",
      firstSurname: "de la Cruz",
    });
  });

  it("escribe la auditoría CONSULTA_USUARIOS_NUEVOS con el id del admin", async () => {
    const admin = await createPanelUserFixture({ role: "ADMIN" });
    const from = new Date("2026-09-01T00:00:00Z");
    const to = new Date("2026-09-10T23:59:59Z");
    const cuenta = await createAccountFixture();
    await prisma.passengerAccount.update({
      where: { id: cuenta.id },
      data: { createdAt: new Date("2026-09-05T12:00:00Z") },
    });

    await listNewAccounts(from, to, admin.id);

    const auditoria = await prisma.auditLog.findFirst({
      where: { action: "CONSULTA_USUARIOS_NUEVOS", actorPanelUserId: admin.id },
    });
    expect(auditoria).not.toBeNull();
    expect(auditoria?.entityType).toBe("PassengerAccount");
    expect(auditoria?.entityId).toBe("consulta");
    expect((auditoria?.after as Record<string, unknown>)?.resultados).toBe(1);
  });
});

describe("getTripDetail", () => {
  it("trae solo a los pasajeros abordados, calcula la duración y rellena agencia, ruta, chofer y unidad", async () => {
    const {
      admin,
      agencia,
      ruta,
      chofer,
      vehiculo,
      salida,
      tripLog,
      reservaAbordada,
      boardedAt,
      departedAt,
      arrivedAt,
    } = await tripDetailScenario();

    const detalle = await getTripDetail(tripLog.id, admin.id);

    expect(detalle).not.toBeNull();
    expect(detalle?.tripLogId).toBe(tripLog.id);
    expect(detalle?.departureId).toBe(salida.id);
    expect(detalle?.agencyName).toBe(agencia.name);
    expect(detalle?.routeName).toBe(ruta.name);
    expect(detalle?.origin).toBe(ruta.origin);
    expect(detalle?.meetingPoint).toBe(ruta.meetingPoint);
    expect(detalle?.destination).toBe(ruta.destination);
    expect(detalle?.driverName).toBe(chofer.fullName);
    expect(detalle?.driverIdNumber).toBe(chofer.idNumber);
    expect(detalle?.vehiclePlate).toBe(vehiculo.plate);
    expect(detalle?.vehicleBrand).toBe(vehiculo.brand);
    expect(detalle?.vehicleModel).toBe(vehiculo.model);
    expect(detalle?.departsAt.getTime()).toBe(salida.departsAt.getTime());
    expect(detalle?.departedAt?.getTime()).toBe(departedAt.getTime());
    expect(detalle?.arrivedAt?.getTime()).toBe(arrivedAt.getTime());
    expect(detalle?.durationMinutes).toBe(515);
    expect(detalle?.passengerCount).toBe(1);
    expect(detalle?.passengers).toHaveLength(1);
    expect(detalle?.passengers[0]).toMatchObject({
      reservationCode: reservaAbordada.code,
      isHolder: true,
    });
    expect(detalle?.passengers[0]?.boardedAt.getTime()).toBe(boardedAt.getTime());
  });

  it("escribe la auditoría CONSULTA_PASAJEROS_VIAJE", async () => {
    const { admin, tripLog, salida } = await tripDetailScenario();

    await getTripDetail(tripLog.id, admin.id);

    const auditoria = await prisma.auditLog.findFirst({
      where: { action: "CONSULTA_PASAJEROS_VIAJE", actorPanelUserId: admin.id },
    });
    expect(auditoria).not.toBeNull();
    expect(auditoria?.entityType).toBe("TripLog");
    expect(auditoria?.entityId).toBe(tripLog.id);
    expect((auditoria?.after as Record<string, unknown>)?.departureId).toBe(salida.id);
    expect((auditoria?.after as Record<string, unknown>)?.pasajeros).toBe(1);
  });

  it("devuelve null para un viaje inexistente y no audita", async () => {
    const admin = await createPanelUserFixture({ role: "ADMIN" });
    const idInexistente = "00000000-0000-0000-0000-000000000000";

    const detalle = await getTripDetail(idInexistente, admin.id);

    expect(detalle).toBeNull();
    const auditoria = await prisma.auditLog.findFirst({
      where: { action: "CONSULTA_PASAJEROS_VIAJE" },
    });
    expect(auditoria).toBeNull();
  });
});
