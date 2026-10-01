import type { Prisma, SalesChannel } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface RecentTicketRow {
  reservationId: string;
  code: string;
  holderName: string;
  routeName: string;
  origin: string;
  destination: string;
  departsAt: Date;
  issuedAt: Date;
  salesChannel: SalesChannel;
  passengerCount: number;
  totalUsd: string;
}

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

/** Tickets emitidos recientemente en la agencia, para el tablero del operador. */
export async function listRecentTickets(
  agencyId: string,
  filter: { from: Date; to: Date; limit?: number },
): Promise<{ rows: RecentTicketRow[]; total: number }> {
  const limit = Math.min(MAX_LIMIT, Math.max(1, filter.limit ?? DEFAULT_LIMIT));

  const where = {
    issuedAt: { gte: filter.from, lte: filter.to },
    reservation: { departure: { route: { agencyId } } },
  } satisfies Prisma.TicketWhereInput;

  const [tickets, total] = await Promise.all([
    prisma.ticket.findMany({
      where,
      include: {
        reservation: { include: { account: true, departure: { include: { route: true } } } },
      },
      orderBy: { issuedAt: "desc" },
      take: limit,
    }),
    prisma.ticket.count({ where }),
  ]);

  return {
    rows: tickets.map((t) => ({
      reservationId: t.reservationId,
      code: t.reservation.code,
      holderName: t.reservation.account.fullName,
      routeName: t.reservation.departure.route.name,
      origin: t.reservation.departure.route.origin,
      destination: t.reservation.departure.route.destination,
      departsAt: t.reservation.departure.departsAt,
      issuedAt: t.issuedAt,
      salesChannel: t.reservation.salesChannel,
      passengerCount: t.reservation.passengerCount,
      totalUsd: t.reservation.totalUsd.toString(),
    })),
    total,
  };
}
