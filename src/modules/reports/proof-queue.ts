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
 * Cola de comprobantes pendientes de revisión de la agencia, del más viejo al
 * más nuevo: es el orden en el que el operador debe atenderlos.
 */
export async function listPendingProofQueue(
  agencyId: string,
  filter: { page?: number; pageSize?: number } = {},
): Promise<{ rows: PendingProofRow[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, filter.page ?? 1);
  const pageSize = Math.min(
    PAGE_SIZE_MAX,
    Math.max(PAGE_SIZE_MIN, filter.pageSize ?? PAGE_SIZE_DEFAULT),
  );

  const where = {
    status: "PENDIENTE" as const,
    reservation: { departure: { route: { agencyId } } },
  } satisfies Prisma.PaymentProofWhereInput;

  const [comprobantes, total] = await Promise.all([
    prisma.paymentProof.findMany({
      where,
      include: {
        reservation: { include: { account: true, departure: { include: { route: true } } } },
      },
      orderBy: { createdAt: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.paymentProof.count({ where }),
  ]);

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
