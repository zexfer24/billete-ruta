import type { Currency, DepartureStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { maskIdNumber } from "@/lib/identity";
import { balanceUsd } from "@/modules/catalog";
import { proofCoverage, type ProofCoverage } from "@/modules/payments";

/** Comprobantes por página por defecto, con piso y techo. */
const PAGE_SIZE_DEFAULT = 25;
const PAGE_SIZE_MIN = 10;
const PAGE_SIZE_MAX = 100;

export interface PendingProofRow {
  proofId: string;
  reservationId: string;
  code: string;
  reference: string;
  holderName: string;
  maskedHolderIdNumber: string;
  routeName: string;
  origin: string;
  destination: string;
  departsAt: Date;
  departureStatus: DepartureStatus;
  amount: Prisma.Decimal;
  currency: Currency;
  amountUsd: Prisma.Decimal;
  totalUsd: Prisma.Decimal;
  balanceUsd: Prisma.Decimal;
  coverage: ProofCoverage;
  createdAt: Date;
}

/**
 * Cuánto tiempo hacia atrás una salida que sigue PROGRAMADA o con el embarque
 * abierto cuenta todavía como "por salir" en la cola: es la misma ventana que
 * usa la flota (`VIGENCIA_EN_CURSO_MS` en fleet-status.ts). Un bus atrasado
 * sigue en el terminal y su comprobante es el más urgente; una salida vencida
 * hace más de 12 horas que nadie cerró ya no apura a nadie.
 */
const VIGENCIA_POR_SALIR_MS = 12 * 3_600_000;

/** Estados de salida en los que el pasajero todavía puede necesitar su ticket para abordar. */
const ESTADOS_POR_SALIR = ["PROGRAMADA", "MANIFIESTO_CERRADO"] satisfies DepartureStatus[];

const INCLUDE_COLA = {
  reservation: { include: { account: true, departure: { include: { route: true } } } },
} satisfies Prisma.PaymentProofInclude;

/**
 * Cola de comprobantes pendientes de revisión de la agencia, en el orden en el
 * que el operador debe atenderlos:
 * 1. Primero los de salidas que todavía no partieron (programadas o con el
 *    embarque abierto, incluidas las atrasadas de las últimas 12 horas), de la
 *    salida más próxima a la más lejana y, dentro de una misma salida, del
 *    comprobante más viejo al más nuevo. Así el de un bus que sale en 30
 *    minutos queda en la página 1 aunque haya llegado último.
 * 2. Después los de salidas que ya partieron, se cancelaron o vencieron, del
 *    más viejo al más nuevo. No se ocultan: nadie más los resuelve, y el total
 *    tiene que coincidir con `countPendingProofs` (la insignia del menú).
 * La paginación recorre las dos partes como una sola lista.
 */
export async function listPendingProofQueue(
  agencyId: string,
  filter: { page?: number; pageSize?: number } = {},
  now: Date = new Date(),
): Promise<{ rows: PendingProofRow[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, filter.page ?? 1);
  const pageSize = Math.min(
    PAGE_SIZE_MAX,
    Math.max(PAGE_SIZE_MIN, filter.pageSize ?? PAGE_SIZE_DEFAULT),
  );

  const porSalir = {
    status: { in: ESTADOS_POR_SALIR },
    departsAt: { gte: new Date(now.getTime() - VIGENCIA_POR_SALIR_MS) },
  } satisfies Prisma.DepartureWhereInput;

  const where = {
    status: "PENDIENTE" as const,
    reservation: { departure: { route: { agencyId } } },
  } satisfies Prisma.PaymentProofWhereInput;
  const wherePrimero = {
    status: "PENDIENTE" as const,
    reservation: { departure: { route: { agencyId }, ...porSalir } },
  } satisfies Prisma.PaymentProofWhereInput;
  const whereDespues = {
    status: "PENDIENTE" as const,
    reservation: { departure: { route: { agencyId }, NOT: porSalir } },
  } satisfies Prisma.PaymentProofWhereInput;

  const [total, totalPrimero] = await Promise.all([
    prisma.paymentProof.count({ where }),
    prisma.paymentProof.count({ where: wherePrimero }),
  ]);

  const desde = (page - 1) * pageSize;
  const primeros =
    desde < totalPrimero
      ? await prisma.paymentProof.findMany({
          where: wherePrimero,
          include: INCLUDE_COLA,
          orderBy: [{ reservation: { departure: { departsAt: "asc" } } }, { createdAt: "asc" }, { id: "asc" }],
          skip: desde,
          take: pageSize,
        })
      : [];
  const faltan = pageSize - primeros.length;
  const despues =
    faltan > 0
      ? await prisma.paymentProof.findMany({
          where: whereDespues,
          include: INCLUDE_COLA,
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          skip: Math.max(0, desde - totalPrimero),
          take: faltan,
        })
      : [];
  const comprobantes = [...primeros, ...despues];

  const rows = comprobantes.map((c) => {
    const reserva = c.reservation;
    return {
      proofId: c.id,
      reservationId: reserva.id,
      code: reserva.code,
      reference: c.reference,
      holderName: reserva.account.fullName,
      maskedHolderIdNumber: maskIdNumber(reserva.account.idNumber),
      routeName: reserva.departure.route.name,
      origin: reserva.departure.route.origin,
      destination: reserva.departure.route.destination,
      departsAt: reserva.departure.departsAt,
      departureStatus: reserva.departure.status,
      amount: c.amount,
      currency: c.currency,
      amountUsd: c.amountUsd,
      totalUsd: reserva.totalUsd,
      balanceUsd: balanceUsd(reserva.totalUsd, reserva.paidUsd),
      coverage: proofCoverage(reserva.totalUsd, reserva.paidUsd, c.amountUsd),
      createdAt: c.createdAt,
    };
  });

  return { rows, total, page, pageSize };
}
