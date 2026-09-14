import type {
  Currency,
  DepartureStatus,
  PaymentKind,
  Prisma,
  ReservationStatus,
  SalesChannel,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { maskIdNumber } from "@/lib/identity";
import { ZERO } from "@/lib/decimal";
import { balanceUsd } from "@/modules/catalog";
import { ForbiddenError } from "@/modules/auth";
import { proofCoverage, type ProofCoverage, type ProofHistoryItem } from "@/modules/payments";

/** Estados de reserva en los que todavía tiene sentido cobrar en efectivo. */
const CAN_REGISTER_CASH_STATUSES: readonly ReservationStatus[] = [
  "PENDIENTE_PAGO",
  "EN_VALIDACION",
  "ABONADA",
  "PAGO_EN_SITIO",
];

/** Estados de salida en los que todavía se puede cobrar: antes de que salga el vehículo. */
const CAN_REGISTER_CASH_DEPARTURE_STATUSES: readonly DepartureStatus[] = [
  "PROGRAMADA",
  "MANIFIESTO_CERRADO",
];

export interface AgencyReservationDetail {
  reservation: {
    id: string;
    code: string;
    status: ReservationStatus;
    salesChannel: SalesChannel;
    createdAt: Date;
    passengerCount: number;
    currency: Currency;
    exchangeRateUsed: Prisma.Decimal;
    amountInCurrency: Prisma.Decimal;
    fareTotalUsd: Prisma.Decimal;
    taxTotalUsd: Prisma.Decimal;
    totalUsd: Prisma.Decimal;
    paidUsd: Prisma.Decimal;
    balanceUsd: Prisma.Decimal;
    expiresAt: Date | null;
    paidAt: Date | null;
    paymentMethodName: string;
    paymentMethodKind: PaymentKind;
  };
  holder: { fullName: string; maskedIdNumber: string };
  departure: {
    id: string;
    routeName: string;
    origin: string;
    destination: string;
    departsAt: Date;
    status: DepartureStatus;
    vehiclePlate: string;
  };
  passengers: {
    id: string;
    fullName: string;
    maskedIdNumber: string;
    isHolder: boolean;
    boardedAt: Date | null;
  }[];
  ticket: { issuedAt: Date; pdfPath: string } | null;
  pendingProofs: {
    id: string;
    reference: string;
    paymentMethodName: string;
    amount: Prisma.Decimal;
    currency: Currency;
    amountUsd: Prisma.Decimal;
    createdAt: Date;
    imagePath: string;
    coverage: ProofCoverage;
  }[];
  history: ProofHistoryItem[];
  canRegisterCash: boolean;
}

/**
 * Detalle completo de una reserva para el operador: totales, pasajeros,
 * comprobantes por revisar, historial de pagos y si todavía admite un cobro
 * en efectivo. Es de solo lectura: no escribe auditoría, igual que
 * `getProofReview`, porque el operador ya ve estos datos en la lista.
 */
export async function getAgencyReservationDetail(
  reservationId: string,
  agencyId: string,
): Promise<AgencyReservationDetail | null> {
  const reserva = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: {
      account: true,
      paymentMethod: true,
      departure: { include: { route: true, vehicle: true } },
      passengers: true,
      ticket: true,
      proofs: { include: { paymentMethod: true } },
      cashPayments: true,
    },
  });

  if (!reserva) return null;
  if (reserva.departure.route.agencyId !== agencyId) {
    throw new ForbiddenError("OPERADOR", "payments.review");
  }

  const saldo = balanceUsd(reserva.totalUsd, reserva.paidUsd);

  const pendingProofs = reserva.proofs
    .filter((p) => p.status === "PENDIENTE")
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .map((p) => ({
      id: p.id,
      reference: p.reference,
      paymentMethodName: p.paymentMethod.name,
      amount: p.amount,
      currency: p.currency,
      amountUsd: p.amountUsd,
      createdAt: p.createdAt,
      imagePath: p.imagePath,
      coverage: proofCoverage(reserva.totalUsd, reserva.paidUsd, p.amountUsd),
    }));

  const historialComprobantes: ProofHistoryItem[] = reserva.proofs
    .filter((p) => p.status !== "PENDIENTE")
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

  const canRegisterCash =
    (CAN_REGISTER_CASH_STATUSES as readonly ReservationStatus[]).includes(reserva.status) &&
    (CAN_REGISTER_CASH_DEPARTURE_STATUSES as readonly DepartureStatus[]).includes(
      reserva.departure.status,
    ) &&
    saldo.greaterThan(ZERO);

  return {
    reservation: {
      id: reserva.id,
      code: reserva.code,
      status: reserva.status,
      salesChannel: reserva.salesChannel,
      createdAt: reserva.createdAt,
      passengerCount: reserva.passengerCount,
      currency: reserva.currency,
      exchangeRateUsed: reserva.exchangeRateUsed,
      amountInCurrency: reserva.amountInCurrency,
      fareTotalUsd: reserva.fareTotalUsd,
      taxTotalUsd: reserva.taxTotalUsd,
      totalUsd: reserva.totalUsd,
      paidUsd: reserva.paidUsd,
      balanceUsd: saldo,
      expiresAt: reserva.expiresAt,
      paidAt: reserva.paidAt,
      paymentMethodName: reserva.paymentMethod.name,
      paymentMethodKind: reserva.paymentMethod.kind,
    },
    holder: {
      fullName: reserva.account.fullName,
      maskedIdNumber: maskIdNumber(reserva.account.idNumber),
    },
    departure: {
      id: reserva.departure.id,
      routeName: reserva.departure.route.name,
      origin: reserva.departure.route.origin,
      destination: reserva.departure.route.destination,
      departsAt: reserva.departure.departsAt,
      status: reserva.departure.status,
      vehiclePlate: reserva.departure.vehicle.plate,
    },
    passengers: reserva.passengers.map((p) => ({
      id: p.id,
      fullName: p.fullName,
      maskedIdNumber: maskIdNumber(p.idNumber),
      isHolder: p.isHolder,
      boardedAt: p.boardedAt,
    })),
    ticket: reserva.ticket ? { issuedAt: reserva.ticket.issuedAt, pdfPath: reserva.ticket.pdfPath } : null,
    pendingProofs,
    history,
    canRegisterCash,
  };
}
