import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { round2, ZERO } from "@/lib/decimal";
import { durationMinutes, formatCaracas } from "@/lib/time";
import { firstNamePart } from "@/lib/identity";
import { writeAudit } from "@/modules/audit";

/**
 * Tasa de salida recaudada por el terminal. Solo cuenta reservas que llegaron a
 * pagadas dentro de la ventana, y solo la tasa, nunca la tarifa de la agencia.
 */
export async function departureTaxRevenue(
  from: Date,
  to: Date,
): Promise<{ totalUsd: Prisma.Decimal; reservations: number; passengers: number }> {
  const reservas = await prisma.reservation.findMany({
    where: { paidAt: { gte: from, lte: to } },
    select: { taxTotalUsd: true, passengerCount: true },
  });
  const totalUsd = reservas.reduce((acc, r) => round2(acc.add(r.taxTotalUsd)), ZERO);
  const passengers = reservas.reduce((acc, r) => acc + r.passengerCount, 0);
  return { totalUsd, reservations: reservas.length, passengers };
}

/** Tasa de salida recaudada por hora del día, en formato de 24 horas. */
export async function departureTaxByHour(
  from: Date,
  to: Date,
): Promise<Array<{ hour: string; totalUsd: Prisma.Decimal }>> {
  const reservas = await prisma.reservation.findMany({
    where: { paidAt: { gte: from, lte: to } },
    select: { taxTotalUsd: true, paidAt: true },
  });

  const porHora = new Map<string, Prisma.Decimal>();
  for (const reserva of reservas) {
    if (!reserva.paidAt) continue;
    const hora = formatCaracas(reserva.paidAt, "HH");
    porHora.set(hora, round2((porHora.get(hora) ?? ZERO).add(reserva.taxTotalUsd)));
  }

  return Array.from({ length: 24 }, (_, i) => {
    const hora = String(i).padStart(2, "0");
    return { hour: `${hora}:00`, totalUsd: porHora.get(hora) ?? ZERO };
  });
}

/** Recorridos completados en el terminal, de todas las agencias. */
export async function terminalTripCount(from: Date, to: Date): Promise<number> {
  return prisma.tripLog.count({ where: { arrivedAt: { gte: from, lte: to } } });
}

export interface TerminalTripRow {
  tripLogId: string;
  departedAt: Date | null;
  origin: string;
  meetingPoint: string;
  destination: string;
  agencyName: string;
}

/** Lista de recorridos completados en el terminal, para el tablero del admin. */
export async function listTerminalTrips(
  from: Date,
  to: Date,
  options: { limit?: number } = {},
): Promise<{ rows: TerminalTripRow[]; total: number }> {
  const limit = Math.min(500, Math.max(1, options.limit ?? 100));
  const where: Prisma.TripLogWhereInput = { arrivedAt: { gte: from, lte: to } };

  const [registros, total] = await Promise.all([
    prisma.tripLog.findMany({
      where,
      include: { departure: { include: { route: { include: { agency: true } } } } },
      orderBy: { departedAt: "desc" },
      take: limit,
    }),
    prisma.tripLog.count({ where }),
  ]);

  return {
    rows: registros.map((r) => ({
      tripLogId: r.id,
      departedAt: r.departedAt,
      origin: r.departure.route.origin,
      meetingPoint: r.departure.route.meetingPoint,
      destination: r.departure.route.destination,
      agencyName: r.departure.route.agency.name,
    })),
    total,
  };
}

export async function newAccounts(from: Date, to: Date): Promise<number> {
  return prisma.passengerAccount.count({ where: { createdAt: { gte: from, lte: to } } });
}

export interface NewAccountRow {
  id: string;
  createdAt: Date;
  idNumber: string;
  firstName: string;
  firstSurname: string;
}

/**
 * Cuentas nuevas del terminal, para el tablero del admin. Cada consulta queda
 * auditada porque expone la identidad de pasajeros concretos.
 */
export async function listNewAccounts(
  from: Date,
  to: Date,
  panelUserId: string,
  options: { limit?: number } = {},
): Promise<{ rows: NewAccountRow[]; total: number }> {
  const limit = Math.min(500, Math.max(1, options.limit ?? 100));
  const where: Prisma.PassengerAccountWhereInput = { createdAt: { gte: from, lte: to } };

  const [cuentas, total] = await Promise.all([
    prisma.passengerAccount.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.passengerAccount.count({ where }),
  ]);

  const rows: NewAccountRow[] = cuentas.map((c) => ({
    id: c.id,
    createdAt: c.createdAt,
    idNumber: c.idNumber,
    firstName: firstNamePart(c.givenNames),
    firstSurname: firstNamePart(c.surnames),
  }));

  await prisma.$transaction(async (tx) => {
    await writeAudit(tx, {
      actorType: "PANEL",
      actorPanelUserId: panelUserId,
      entityType: "PassengerAccount",
      entityId: "consulta",
      action: "CONSULTA_USUARIOS_NUEVOS",
      after: {
        desde: from.toISOString(),
        hasta: to.toISOString(),
        resultados: rows.length,
        total,
      },
    });
  });

  return { rows, total };
}

/** Cuentas con dos o más viajes pagados: los usuarios que vuelven. */
export async function recurringAccounts(): Promise<number> {
  const agrupado = await prisma.reservation.groupBy({
    by: ["accountId"],
    where: { status: { in: ["PAGADA", "ABORDADA"] } },
    _count: { _all: true },
  });
  return agrupado.filter((fila) => fila._count._all >= 2).length;
}

export interface AgencyMovementRow {
  tripLogId: string;
  agencyName: string;
  routeName: string;
  origin: string;
  destination: string;
  driverName: string;
  vehiclePlate: string;
  boardingStartedAt: Date | null;
  departedAt: Date | null;
  arrivedAt: Date | null;
  durationMinutes: number | null;
  passengerCount: number;
}

/** Movimientos de todas las agencias del terminal. */
export async function agencyMovements(
  from: Date,
  to: Date,
  agencyId?: string,
): Promise<AgencyMovementRow[]> {
  const registros = await prisma.tripLog.findMany({
    where: {
      ...(agencyId ? { departure: { route: { agencyId } } } : {}),
      OR: [
        { departedAt: { gte: from, lte: to } },
        { arrivedAt: { gte: from, lte: to } },
        { boardingStartedAt: { gte: from, lte: to } },
      ],
    },
    include: {
      driver: true,
      vehicle: true,
      departure: { include: { route: { include: { agency: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  return registros.map((r) => ({
    tripLogId: r.id,
    agencyName: r.departure.route.agency.name,
    routeName: r.departure.route.name,
    origin: r.departure.route.origin,
    destination: r.departure.route.destination,
    driverName: r.driver.fullName,
    vehiclePlate: r.vehicle.plate,
    boardingStartedAt: r.boardingStartedAt,
    departedAt: r.departedAt,
    arrivedAt: r.arrivedAt,
    durationMinutes:
      r.departedAt && r.arrivedAt ? durationMinutes(r.departedAt, r.arrivedAt) : null,
    passengerCount: r.passengerCount,
  }));
}

export interface TripPassengerRow {
  id: string;
  fullName: string;
  idNumber: string;
  isHolder: boolean;
  reservationCode: string;
  boardedAt: Date;
}

export interface TripDetail {
  tripLogId: string;
  departureId: string;
  agencyName: string;
  routeName: string;
  origin: string;
  meetingPoint: string;
  destination: string;
  driverName: string;
  driverIdNumber: string;
  vehiclePlate: string;
  vehicleBrand: string;
  vehicleModel: string;
  departsAt: Date;
  boardingStartedAt: Date | null;
  departedAt: Date | null;
  arrivedAt: Date | null;
  durationMinutes: number | null;
  passengerCount: number;
  passengers: TripPassengerRow[];
}

/**
 * Detalle de un viaje para el panel de Movimientos del admin: agencia, ruta,
 * chofer, unidad y el manifiesto de pasajeros que abordaron. La cédula va
 * completa porque es el manifiesto y solo lo ve el admin. Cada consulta
 * queda auditada.
 */
export async function getTripDetail(
  tripLogId: string,
  panelUserId: string,
): Promise<TripDetail | null> {
  const registro = await prisma.tripLog.findUnique({
    where: { id: tripLogId },
    include: {
      driver: true,
      vehicle: true,
      departure: { include: { route: { include: { agency: true } } } },
    },
  });
  if (!registro) return null;

  const pasajeros = await prisma.passenger.findMany({
    where: {
      reservation: { departureId: registro.departureId },
      boardedAt: { not: null },
    },
    include: { reservation: { select: { code: true } } },
    orderBy: [{ boardedAt: "asc" }, { createdAt: "asc" }],
  });

  const detalle: TripDetail = {
    tripLogId: registro.id,
    departureId: registro.departureId,
    agencyName: registro.departure.route.agency.name,
    routeName: registro.departure.route.name,
    origin: registro.departure.route.origin,
    meetingPoint: registro.departure.route.meetingPoint,
    destination: registro.departure.route.destination,
    driverName: registro.driver.fullName,
    driverIdNumber: registro.driver.idNumber,
    vehiclePlate: registro.vehicle.plate,
    vehicleBrand: registro.vehicle.brand,
    vehicleModel: registro.vehicle.model,
    departsAt: registro.departure.departsAt,
    boardingStartedAt: registro.boardingStartedAt,
    departedAt: registro.departedAt,
    arrivedAt: registro.arrivedAt,
    durationMinutes:
      registro.departedAt && registro.arrivedAt
        ? durationMinutes(registro.departedAt, registro.arrivedAt)
        : null,
    passengerCount: registro.passengerCount,
    passengers: pasajeros.map((p) => ({
      id: p.id,
      fullName: p.fullName,
      idNumber: p.idNumber,
      isHolder: p.isHolder,
      reservationCode: p.reservation.code,
      // El where filtró boardedAt no nulo, así que el valor siempre existe aquí.
      boardedAt: p.boardedAt as Date,
    })),
  };

  await prisma.$transaction(async (tx) => {
    await writeAudit(tx, {
      actorType: "PANEL",
      actorPanelUserId: panelUserId,
      entityType: "TripLog",
      entityId: tripLogId,
      action: "CONSULTA_PASAJEROS_VIAJE",
      after: { departureId: registro.departureId, pasajeros: detalle.passengers.length },
    });
  });

  return detalle;
}

export interface AccountRow {
  id: string;
  idNumber: string;
  fullName: string;
  phone: string;
  birthYear: number;
  createdAt: Date;
  lastLoginAt: Date | null;
  paidTrips: number;
}

/**
 * Base de datos de usuarios. Es información sensible: cada consulta queda
 * registrada en la bitácora con el administrador que la hizo y su filtro.
 */
export async function listAccounts(
  filter: { search?: string; page?: number; pageSize?: number },
  panelUserId: string,
): Promise<{ rows: AccountRow[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, filter.page ?? 1);
  const pageSize = Math.min(100, Math.max(10, filter.pageSize ?? 25));
  const busqueda = filter.search?.trim();

  const where: Prisma.PassengerAccountWhereInput = busqueda
    ? {
        OR: [
          { idNumber: { contains: busqueda.toUpperCase() } },
          { fullName: { contains: busqueda, mode: "insensitive" } },
          { phone: { contains: busqueda } },
        ],
      }
    : {};

  const [cuentas, total] = await Promise.all([
    prisma.passengerAccount.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        _count: { select: { reservations: true } },
        reservations: {
          where: { status: { in: ["PAGADA", "ABORDADA"] } },
          select: { id: true },
        },
      },
    }),
    prisma.passengerAccount.count({ where }),
  ]);

  await prisma.$transaction(async (tx) => {
    await writeAudit(tx, {
      actorType: "PANEL",
      actorPanelUserId: panelUserId,
      entityType: "PassengerAccount",
      entityId: "consulta",
      action: "CONSULTA_USUARIOS",
      after: { filtro: busqueda ?? "(sin filtro)", pagina: page, resultados: cuentas.length },
    });
  });

  return {
    rows: cuentas.map((c) => ({
      id: c.id,
      idNumber: c.idNumber,
      fullName: c.fullName,
      phone: c.phone,
      birthYear: c.birthYear,
      createdAt: c.createdAt,
      lastLoginAt: c.lastLoginAt,
      paidTrips: c.reservations.length,
    })),
    total,
    page,
    pageSize,
  };
}

/** Cifras del tablero del terminal. */
export async function terminalDashboard(from: Date, to: Date) {
  const [tasa, recorridos, nuevos, recurrentes, agencias] = await Promise.all([
    departureTaxRevenue(from, to),
    terminalTripCount(from, to),
    newAccounts(from, to),
    recurringAccounts(),
    prisma.agency.count({ where: { active: true } }),
  ]);
  return { tasa, recorridos, nuevos, recurrentes, agencias };
}
