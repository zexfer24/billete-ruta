import { Prisma } from "@prisma/client";
import type { DepartureStatus, SalesChannel } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { round2, toDecimal, ZERO } from "@/lib/decimal";
import { durationMinutes } from "@/lib/time";
import { paymentStateOf, paymentStateWhere, reservationViewWhere, RESERVATION_VIEWS } from "./payment-state";
import type { PaymentState, ReservationView } from "./payment-state";

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
  hasPendingProof: boolean;
  ticketIssuedAt: Date | null;
  salesChannel: SalesChannel;
  departureStatus: DepartureStatus;
}

export interface AgencyPassengersPage {
  rows: AgencyPassengerRow[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * `where` base compartido por `listAgencyPassengers` y
 * `countAgencyReservationViews`: agencia, salida y búsqueda. El estado de
 * pago y la vista se agregan aparte porque cada función los combina distinto.
 */
function agencyPassengersBaseWhere(
  agencyId: string,
  filter: { departureId?: string; search?: string },
): Prisma.ReservationWhereInput {
  return {
    departure: { route: { agencyId }, ...(filter.departureId ? { id: filter.departureId } : {}) },
    ...(filter.search
      ? {
          OR: [
            { code: { contains: filter.search.toUpperCase() } },
            { account: { fullName: { contains: filter.search, mode: "insensitive" } } },
            { account: { idNumber: { contains: filter.search.toUpperCase() } } },
          ],
        }
      : {}),
  };
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
    view?: ReservationView;
    search?: string;
    page?: number;
    pageSize?: number;
  } = {},
): Promise<AgencyPassengersPage> {
  const page = Math.max(1, filter.page ?? 1);
  const pageSize = Math.min(500, Math.max(10, filter.pageSize ?? 50));

  const condiciones: Prisma.ReservationWhereInput[] = [];
  if (filter.paymentState) condiciones.push(paymentStateWhere(filter.paymentState));
  if (filter.view) condiciones.push(reservationViewWhere(filter.view));

  const where = {
    ...agencyPassengersBaseWhere(agencyId, filter),
    ...(condiciones.length > 0 ? { AND: condiciones } : {}),
  } satisfies Prisma.ReservationWhereInput;

  const orderBy: Prisma.ReservationOrderByWithRelationInput[] =
    filter.view === "por-cobrar"
      ? [{ departure: { departsAt: "asc" } }, { createdAt: "desc" }]
      : [{ createdAt: "desc" }];

  const [reservas, total] = await Promise.all([
    prisma.reservation.findMany({
      where,
      include: {
        account: true,
        departure: { include: { route: true } },
        proofs: { where: { status: "PENDIENTE" }, select: { id: true }, take: 1 },
        ticket: { select: { issuedAt: true } },
      },
      orderBy,
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
      hasPendingProof: r.proofs.length > 0,
      ticketIssuedAt: r.ticket?.issuedAt ?? null,
      salesChannel: r.salesChannel,
      departureStatus: r.departure.status,
    };
  });

  return { rows, total, page, pageSize };
}

/**
 * Cuántas reservas caen en cada vista de "Pasajeros y pagos", con el mismo
 * filtro de salida y búsqueda que la lista. Usa el mismo `where` base para no
 * duplicar el armado del filtro.
 */
export async function countAgencyReservationViews(
  agencyId: string,
  filter: { departureId?: string; search?: string } = {},
): Promise<Record<ReservationView, number>> {
  const base = agencyPassengersBaseWhere(agencyId, filter);

  const conteos = await Promise.all(
    RESERVATION_VIEWS.map((view) =>
      prisma.reservation.count({ where: { ...base, AND: [reservationViewWhere(view)] } }),
    ),
  );

  return Object.fromEntries(RESERVATION_VIEWS.map((view, i) => [view, conteos[i]])) as Record<
    ReservationView,
    number
  >;
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
