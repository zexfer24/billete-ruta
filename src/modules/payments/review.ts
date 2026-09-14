import type { Currency, ProofStatus, ReservationStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ForbiddenError } from "@/modules/auth";
import { proofCoverage, type ProofCoverage } from "./coverage";

export interface ProofHistoryItem {
  id: string;
  kind: "COMPROBANTE" | "EFECTIVO";
  /** Fecha del pago: createdAt del comprobante o collectedAt del cobro en efectivo. */
  at: Date;
  amount: Prisma.Decimal;
  currency: Currency;
  amountUsd: Prisma.Decimal;
  status: ProofStatus | null;
  reference: string | null;
  rejectionReason: string | null;
}

export interface ProofReview {
  proof: {
    id: string;
    reference: string;
    paymentMethodName: string;
    amount: Prisma.Decimal;
    currency: Currency;
    amountUsd: Prisma.Decimal;
    createdAt: Date;
    imagePath: string;
    status: ProofStatus;
    reviewedAt: Date | null;
    rejectionReason: string | null;
  };
  reservation: {
    id: string;
    code: string;
    status: ReservationStatus;
    holderName: string;
    holderIdNumber: string;
    routeName: string;
    origin: string;
    destination: string;
    departsAt: Date;
    passengerCount: number;
    totalUsd: Prisma.Decimal;
    paidUsd: Prisma.Decimal;
  };
  /** Solo se calcula mientras el comprobante sigue pendiente de revisión. */
  coverage: ProofCoverage | null;
  /** Los demás comprobantes y cobros en efectivo de la reserva, del más reciente al más antiguo. */
  history: ProofHistoryItem[];
}

/**
 * Vista de un comprobante para el operador que lo revisa: sus datos, los de la
 * reserva, la cobertura del saldo pendiente y el historial de pagos previos.
 * Es de solo lectura: no escribe auditoría ni cambia estados.
 */
export async function getProofReview(
  proofId: string,
  agencyId: string,
): Promise<ProofReview | null> {
  const comprobante = await prisma.paymentProof.findUnique({
    where: { id: proofId },
    include: {
      paymentMethod: true,
      reservation: {
        include: {
          account: true,
          departure: { include: { route: true } },
          proofs: true,
          cashPayments: true,
        },
      },
    },
  });

  if (!comprobante) return null;

  const reserva = comprobante.reservation;
  if (reserva.departure.route.agencyId !== agencyId) {
    throw new ForbiddenError("OPERADOR", "payments.review");
  }

  const coverage =
    comprobante.status === "PENDIENTE"
      ? proofCoverage(reserva.totalUsd, reserva.paidUsd, comprobante.amountUsd)
      : null;

  const historialComprobantes: ProofHistoryItem[] = reserva.proofs
    .filter((p) => p.id !== comprobante.id)
    .map((p) => ({
      id: p.id,
      kind: "COMPROBANTE",
      at: p.createdAt,
      amount: p.amount,
      currency: p.currency,
      amountUsd: p.amountUsd,
      status: p.status,
      reference: p.reference,
      rejectionReason: p.rejectionReason,
    }));

  const historialEfectivo: ProofHistoryItem[] = reserva.cashPayments.map((c) => ({
    id: c.id,
    kind: "EFECTIVO",
    at: c.collectedAt,
    amount: c.amount,
    currency: c.currency,
    amountUsd: c.amountUsd,
    status: null,
    reference: null,
    rejectionReason: null,
  }));

  const history = [...historialComprobantes, ...historialEfectivo].sort(
    (a, b) => b.at.getTime() - a.at.getTime(),
  );

  return {
    proof: {
      id: comprobante.id,
      reference: comprobante.reference,
      paymentMethodName: comprobante.paymentMethod.name,
      amount: comprobante.amount,
      currency: comprobante.currency,
      amountUsd: comprobante.amountUsd,
      createdAt: comprobante.createdAt,
      imagePath: comprobante.imagePath,
      status: comprobante.status,
      reviewedAt: comprobante.reviewedAt,
      rejectionReason: comprobante.rejectionReason,
    },
    reservation: {
      id: reserva.id,
      code: reserva.code,
      status: reserva.status,
      holderName: reserva.account.fullName,
      holderIdNumber: reserva.account.idNumber,
      routeName: reserva.departure.route.name,
      origin: reserva.departure.route.origin,
      destination: reserva.departure.route.destination,
      departsAt: reserva.departure.departsAt,
      passengerCount: reserva.passengerCount,
      totalUsd: reserva.totalUsd,
      paidUsd: reserva.paidUsd,
    },
    coverage,
    history,
  };
}

/** Cuántos comprobantes pendientes de revisión tiene la agencia, para el contador del menú. */
export async function countPendingProofs(agencyId: string): Promise<number> {
  return prisma.paymentProof.count({
    where: { status: "PENDIENTE", reservation: { departure: { route: { agencyId } } } },
  });
}
