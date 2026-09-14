import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { round2, ZERO } from "@/lib/decimal";
import { caracasDayRange } from "@/lib/time";
import { revenueByRoute } from "./agency";

export interface AgencyDashboard {
  pendingTickets: { total: number; proofsToReview: number; payOnSite: number };
  departures: {
    total: number;
    programadas: number;
    embarcando: number;
    enRuta: number;
    finalizadas: number;
  };
  revenue: { totalUsd: Prisma.Decimal; payments: number };
  failedMessages: number;
}

/** Estados de reserva que siguen ocupando la cola de tickets por resolver. */
const PENDING_STATUSES = ["PENDIENTE_PAGO", "EN_VALIDACION", "ABONADA", "PAGO_EN_SITIO"] as const;
/** Estados de salida en los que una reserva abierta todavía cuenta en la cola. */
const OPEN_DEPARTURE_STATUSES = ["PROGRAMADA", "MANIFIESTO_CERRADO"] as const;

/**
 * Indicadores del tablero del operador: la cola de tickets pendientes (en
 * vivo, sin depender del rango), las salidas del período, la recaudación y
 * los mensajes fallidos.
 *
 * Las salidas se cuentan hasta el **fin del día en Caracas** de `range.to`,
 * no hasta `range.to` mismo: para el período "hoy" (`range.to` = `now`),
 * usar `range.to` a secas dejaba fuera las salidas ya programadas más tarde
 * en el mismo día (a las 00:22, por ejemplo, el tablero mostraba 0 salidas
 * "hoy" aunque hubiera varias programadas para esa noche). La recaudación sí
 * sigue usando `range.to` tal cual: solo cuenta pagos ya recibidos, y un pago
 * no puede existir "en el futuro" del instante en que se consulta.
 */
export async function agencyDashboard(
  agencyId: string,
  range: { from: Date; to: Date },
  now: Date = new Date(),
): Promise<AgencyDashboard> {
  // `now` se mantiene en la firma para no depender del reloj en las pruebas;
  // esta consulta no lo necesita porque la cola pendiente es en vivo y el
  // rango de salidas ya llega calculado desde `caracasPeriodRange`.
  void now;

  const pendingWhere = {
    status: { in: [...PENDING_STATUSES] },
    departure: { route: { agencyId }, status: { in: [...OPEN_DEPARTURE_STATUSES] } },
  } satisfies Prisma.ReservationWhereInput;

  const topeSalidas = caracasDayRange(range.to).to;

  const [total, proofsToReview, payOnSite, agrupadoSalidas, porRuta, failedMessages] =
    await Promise.all([
      prisma.reservation.count({ where: pendingWhere }),
      prisma.paymentProof.count({ where: { status: "PENDIENTE", reservation: pendingWhere } }),
      prisma.reservation.count({ where: { ...pendingWhere, status: "PAGO_EN_SITIO" } }),
      prisma.departure.groupBy({
        by: ["status"],
        where: {
          route: { agencyId },
          departsAt: { gte: range.from, lte: topeSalidas },
          status: { not: "CANCELADA" },
        },
        _count: { _all: true },
      }),
      revenueByRoute(agencyId, range.from, range.to),
      prisma.outboundMessage.count({
        where: { status: "FALLIDO", reservation: { departure: { route: { agencyId } } } },
      }),
    ]);

  const conteoPorEstado = new Map(agrupadoSalidas.map((g) => [g.status, g._count._all]));
  const programadas = conteoPorEstado.get("PROGRAMADA") ?? 0;
  const embarcando = conteoPorEstado.get("MANIFIESTO_CERRADO") ?? 0;
  const enRuta = conteoPorEstado.get("EN_RUTA") ?? 0;
  const finalizadas = conteoPorEstado.get("FINALIZADA") ?? 0;

  const revenue = porRuta.reduce(
    (acc, fila) => ({
      totalUsd: round2(acc.totalUsd.add(fila.totalUsd)),
      payments: acc.payments + fila.payments,
    }),
    { totalUsd: ZERO, payments: 0 },
  );

  return {
    pendingTickets: { total, proofsToReview, payOnSite },
    departures: {
      total: programadas + embarcando + enRuta + finalizadas,
      programadas,
      embarcando,
      enRuta,
      finalizadas,
    },
    revenue,
    failedMessages,
  };
}
