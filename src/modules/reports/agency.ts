import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { round2, toDecimal, ZERO } from "@/lib/decimal";
import { durationMinutes } from "@/lib/time";
import { paymentStateOf, paymentStateWhere } from "./payment-state";
import type { PaymentState } from "./payment-state";

/** Ventana por defecto de los tableros: las últimas 24 horas. */
export function last24h(now: Date = new Date()): { from: Date; to: Date } {
  return { from: new Date(now.getTime() - 24 * 3_600_000), to: now };
}

export interface RouteRevenueRow {
  routeId: string;
  routeName: string;
  origin: string;
  destination: string;
  totalUsd: Prisma.Decimal;
  payments: number;
}

/**
 * Recaudación por ruta de una agencia: suma de comprobantes aprobados y cobros
 * en efectivo, contados por la fecha en que se registró el pago.
 */
export async function revenueByRoute(
  agencyId: string,
  from: Date,
  to: Date,
): Promise<RouteRevenueRow[]> {
  const comprobantes = await prisma.paymentProof.findMany({
    where: {
      status: "APROBADO",
      reviewedAt: { gte: from, lte: to },
      reservation: { departure: { route: { agencyId } } },
    },
    include: { reservation: { include: { departure: { include: { route: true } } } } },
  });

  const efectivo = await prisma.cashPayment.findMany({
    where: {
      collectedAt: { gte: from, lte: to },
      reservation: { departure: { route: { agencyId } } },
    },
    include: { reservation: { include: { departure: { include: { route: true } } } } },
  });

  const acumulado = new Map<string, RouteRevenueRow>();

  const sumar = (
    ruta: { id: string; name: string; origin: string; destination: string },
    monto: Prisma.Decimal,
  ) => {
    const fila = acumulado.get(ruta.id) ?? {
      routeId: ruta.id,
      routeName: ruta.name,
      origin: ruta.origin,
      destination: ruta.destination,
      totalUsd: ZERO,
      payments: 0,
    };
    fila.totalUsd = round2(fila.totalUsd.add(monto));
    fila.payments += 1;
    acumulado.set(ruta.id, fila);
  };

  for (const p of comprobantes) sumar(p.reservation.departure.route, p.amountUsd);
  for (const c of efectivo) sumar(c.reservation.departure.route, c.amountUsd);

  return [...acumulado.values()].sort((a, b) => b.totalUsd.comparedTo(a.totalUsd));
}

export interface AgencyPassengerRow {
  reservationId: string;
  code: string;
  holderName: string;
  holderIdNumber: string;
  routeName: string;
  departsAt: Date;
  passengerCount: number;
  status: string;
  totalUsd: string;
  paidUsd: string;
  balanceUsd: string;
  paymentState: PaymentState;
}

export interface AgencyPassengersPage {
  rows: AgencyPassengerRow[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Pasajeros de la agencia: quién compró, serial y estado de pago. Va paginado
 * porque una agencia con operación normal acumula miles de reservas y volcarlas
 * todas en una tabla la vuelve inservible.
 */
export async function listAgencyPassengers(
  agencyId: string,
  filter: {
    departureId?: string;
    paymentState?: PaymentState;
    search?: string;
    page?: number;
    pageSize?: number;
  } = {},
): Promise<AgencyPassengersPage> {
  const page = Math.max(1, filter.page ?? 1);
  const pageSize = Math.min(500, Math.max(10, filter.pageSize ?? 50));

  const where = {
      departure: { route: { agencyId }, ...(filter.departureId ? { id: filter.departureId } : {}) },
      ...(filter.paymentState ? { AND: [paymentStateWhere(filter.paymentState)] } : {}),
      ...(filter.search
        ? {
            OR: [
              { code: { contains: filter.search.toUpperCase() } },
              { account: { fullName: { contains: filter.search, mode: "insensitive" } } },
              { account: { idNumber: { contains: filter.search.toUpperCase() } } },
            ],
          }
        : {}),
  } satisfies Prisma.ReservationWhereInput;

  const [reservas, total] = await Promise.all([
    prisma.reservation.findMany({
      where,
      include: { account: true, departure: { include: { route: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.reservation.count({ where }),
  ]);

  const rows = reservas.map((r) => {
    const saldo = round2(r.totalUsd.sub(r.paidUsd));
    return {
      reservationId: r.id,
      code: r.code,
      holderName: r.account.fullName,
      holderIdNumber: r.account.idNumber,
      routeName: r.departure.route.name,
      departsAt: r.departure.departsAt,
      passengerCount: r.passengerCount,
      status: r.status,
      totalUsd: r.totalUsd.toString(),
      paidUsd: r.paidUsd.toString(),
      balanceUsd: (saldo.isNegative() ? toDecimal(0) : saldo).toString(),
      paymentState: paymentStateOf(r.status, r.paidUsd),
    };
  });

  return { rows, total, page, pageSize };
}

export interface DriverMovementRow {
  tripLogId: string;
  driverName: string;
  driverIdNumber: string;
  vehiclePlate: string;
  routeName: string;
  boardingStartedAt: Date | null;
  departedAt: Date | null;
  arrivedAt: Date | null;
  durationMinutes: number | null;
  passengerCount: number;
}

/** Movimientos de los choferes: hora de embarque, duración y hora de desembarque. */
export async function driverMovements(
  agencyId: string,
  from: Date,
  to: Date,
): Promise<DriverMovementRow[]> {
  const registros = await prisma.tripLog.findMany({
    where: {
      departure: { route: { agencyId } },
      OR: [
        { departedAt: { gte: from, lte: to } },
        { arrivedAt: { gte: from, lte: to } },
        { boardingStartedAt: { gte: from, lte: to } },
      ],
    },
    include: { driver: true, vehicle: true, departure: { include: { route: true } } },
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  return registros.map((r) => ({
    tripLogId: r.id,
    driverName: r.driver.fullName,
    driverIdNumber: r.driver.idNumber,
    vehiclePlate: r.vehicle.plate,
    routeName: r.departure.route.name,
    boardingStartedAt: r.boardingStartedAt,
    departedAt: r.departedAt,
    arrivedAt: r.arrivedAt,
    durationMinutes:
      r.departedAt && r.arrivedAt ? durationMinutes(r.departedAt, r.arrivedAt) : null,
    passengerCount: r.passengerCount,
  }));
}

/** Resumen para la portada del panel del operador. */
export async function agencyDashboard(agencyId: string, now: Date = new Date()) {
  const { from, to } = last24h(now);
  const [pendientes, proximas, fallidos, recaudacion] = await Promise.all([
    prisma.paymentProof.count({
      where: {
        status: "PENDIENTE",
        reservation: { departure: { route: { agencyId } } },
      },
    }),
    prisma.departure.count({
      where: {
        route: { agencyId },
        status: "PROGRAMADA",
        departsAt: { gte: now, lte: new Date(now.getTime() + 48 * 3_600_000) },
      },
    }),
    prisma.outboundMessage.count({
      where: {
        status: "FALLIDO",
        reservation: { departure: { route: { agencyId } } },
      },
    }),
    revenueByRoute(agencyId, from, to),
  ]);

  const total = recaudacion.reduce((acc, fila) => round2(acc.add(fila.totalUsd)), ZERO);
  return { pendientes, proximas, fallidos, recaudacionUsd: total, porRuta: recaudacion };
}
