import type { Currency, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatMoney, round2, toDecimal, ZERO } from "@/lib/decimal";
import { formatCaracasDateTime24 } from "@/lib/time";
import { writeAudit } from "@/modules/audit";
import { balanceUsd, statusAfterPayment, toUsd } from "@/modules/catalog/pricing";
import { enqueueMessage } from "@/modules/messaging";
import { ForbiddenError } from "@/modules/auth/permissions";
import { NotOwnerError, ValidationError } from "@/modules/booking/errors";
import { transitionReservation } from "@/modules/booking/transition";

/** Estados en los que el pasajero todavía puede subir un comprobante. */
const CAN_SUBMIT_PROOF = ["PENDIENTE_PAGO", "ABONADA", "EN_VALIDACION", "PAGO_EN_SITIO"] as const;

export interface SubmitProofInput {
  reservationId: string;
  accountId: string;
  paymentMethodId: string;
  reference: string;
  amount: string;
  currency: Currency;
  imagePath: string;
  now?: Date;
}

/** El pasajero declara un pago y adjunta su comprobante. Puede ser un abono parcial. */
export async function submitProof(input: SubmitProofInput): Promise<{ proofId: string }> {
  const ahora = input.now ?? new Date();
  const monto = toDecimal(input.amount);
  if (monto.lessThanOrEqualTo(0)) {
    throw new ValidationError("El monto del pago debe ser mayor que cero.");
  }
  if (input.reference.trim().length < 4) {
    throw new ValidationError("La referencia debe tener al menos 4 caracteres.");
  }

  return prisma.$transaction(async (tx) => {
    const reserva = await tx.reservation.findUniqueOrThrow({
      where: { id: input.reservationId },
    });
    if (reserva.accountId !== input.accountId) {
      throw new NotOwnerError();
    }
    if (!(CAN_SUBMIT_PROOF as readonly string[]).includes(reserva.status)) {
      throw new ValidationError(
        "Esta reserva ya no admite pagos. Revisa su estado en tus reservas.",
      );
    }

    const montoUsd = toUsd(monto, input.currency, reserva.exchangeRateUsed);

    const comprobante = await tx.paymentProof.create({
      data: {
        reservationId: reserva.id,
        paymentMethodId: input.paymentMethodId,
        reference: input.reference.trim(),
        imagePath: input.imagePath,
        amount: monto,
        currency: input.currency,
        amountUsd: montoUsd,
        status: "PENDIENTE",
      },
    });

    if (reserva.status !== "EN_VALIDACION" && reserva.status !== "PAGO_EN_SITIO") {
      await transitionReservation(
        {
          reservationId: reserva.id,
          to: "EN_VALIDACION",
          actor: { type: "PASAJERO", accountId: input.accountId },
          now: ahora,
        },
        tx,
      );
    }

    await writeAudit(tx, {
      actorType: "PASAJERO",
      actorAccountId: input.accountId,
      entityType: "PaymentProof",
      entityId: comprobante.id,
      action: "COMPROBANTE_CARGADO",
      after: {
        reservationId: reserva.id,
        amount: monto.toString(),
        currency: input.currency,
        amountUsd: montoUsd.toString(),
        reference: input.reference.trim(),
      },
    });

    return { proofId: comprobante.id };
  });
}

async function assertProofBelongsToAgency(
  tx: Prisma.TransactionClient,
  proofId: string,
  agencyId: string,
) {
  const comprobante = await tx.paymentProof.findUniqueOrThrow({
    where: { id: proofId },
    include: {
      reservation: {
        include: {
          account: true,
          departure: { include: { route: true } },
        },
      },
    },
  });
  if (comprobante.reservation.departure.route.agencyId !== agencyId) {
    throw new ForbiddenError("OPERADOR", "payments.review");
  }
  return comprobante;
}

export interface ApproveProofInput {
  proofId: string;
  panelUserId: string;
  agencyId: string;
  now?: Date;
}

/**
 * El operador valida un comprobante. Suma el abono, y solo cuando el saldo llega
 * a cero la reserva pasa a pagada y corresponde emitir el ticket.
 */
export async function approveProof(
  input: ApproveProofInput,
): Promise<{ shouldIssueTicket: boolean; reservationId: string }> {
  const ahora = input.now ?? new Date();

  return prisma.$transaction(async (tx) => {
    const comprobante = await assertProofBelongsToAgency(tx, input.proofId, input.agencyId);

    // Aprobar dos veces el mismo comprobante no debe sumar el abono otra vez.
    if (comprobante.status === "APROBADO") {
      return { shouldIssueTicket: false, reservationId: comprobante.reservationId };
    }
    if (comprobante.status === "RECHAZADO") {
      throw new ValidationError("Este comprobante ya fue rechazado.");
    }

    const reserva = comprobante.reservation;
    const nuevoPagado = round2(reserva.paidUsd.add(comprobante.amountUsd));
    const excedente = round2(nuevoPagado.sub(reserva.totalUsd));

    await tx.paymentProof.update({
      where: { id: comprobante.id },
      data: {
        status: "APROBADO",
        reviewedByPanelUserId: input.panelUserId,
        reviewedAt: ahora,
      },
    });

    await tx.reservation.update({
      where: { id: reserva.id },
      data: { paidUsd: nuevoPagado },
    });

    const destino = statusAfterPayment(reserva.status, reserva.totalUsd, nuevoPagado);
    let shouldIssueTicket = false;

    if (destino !== reserva.status) {
      const efectos = await transitionReservation(
        {
          reservationId: reserva.id,
          to: destino,
          actor: { type: "PANEL", panelUserId: input.panelUserId },
          now: ahora,
        },
        tx,
      );
      shouldIssueTicket = efectos.shouldIssueTicket;
    }

    await writeAudit(tx, {
      actorType: "PANEL",
      actorPanelUserId: input.panelUserId,
      entityType: "PaymentProof",
      entityId: comprobante.id,
      action: "PAGO_APROBADO",
      before: { paidUsd: reserva.paidUsd.toString(), status: reserva.status },
      after: { paidUsd: nuevoPagado.toString(), status: destino },
    });

    if (excedente.greaterThan(0)) {
      await writeAudit(tx, {
        actorType: "PANEL",
        actorPanelUserId: input.panelUserId,
        entityType: "Reservation",
        entityId: reserva.id,
        action: "PAGO_EN_EXCESO",
        after: { excedenteUsd: excedente.toString() },
      });
    }

    const saldo = balanceUsd(reserva.totalUsd, nuevoPagado);
    if (destino === "ABONADA") {
      await enqueueMessage(tx, {
        reservationId: reserva.id,
        phone: reserva.account.phone,
        templateKey: "abono_registrado",
        payload: {
          nombre: reserva.account.fullName,
          serial: reserva.code,
          abonado: formatMoney(comprobante.amountUsd, "USD"),
          saldo: formatMoney(saldo, "USD"),
        },
      });
    }
    if (destino === "PAGADA") {
      await enqueueMessage(tx, {
        reservationId: reserva.id,
        phone: reserva.account.phone,
        templateKey: "ticket_emitido",
        payload: {
          nombre: reserva.account.fullName,
          serial: reserva.code,
          salida: formatCaracasDateTime24(reserva.departure.departsAt),
          punto: reserva.departure.route.meetingPoint,
        },
      });
    }

    return { shouldIssueTicket, reservationId: reserva.id };
  });
}

export interface RejectProofInput {
  proofId: string;
  panelUserId: string;
  agencyId: string;
  reason: string;
  now?: Date;
}

/**
 * Rechaza un comprobante. La reserva vuelve a pendiente de pago si no tenía
 * abonos previos, o queda abonada si ya había pagos aprobados.
 */
export async function rejectProof(input: RejectProofInput): Promise<void> {
  const ahora = input.now ?? new Date();
  if (input.reason.trim().length < 4) {
    throw new ValidationError("Indica el motivo del rechazo.");
  }

  await prisma.$transaction(async (tx) => {
    const comprobante = await assertProofBelongsToAgency(tx, input.proofId, input.agencyId);
    if (comprobante.status !== "PENDIENTE") {
      throw new ValidationError("Este comprobante ya fue revisado.");
    }
    const reserva = comprobante.reservation;

    await tx.paymentProof.update({
      where: { id: comprobante.id },
      data: {
        status: "RECHAZADO",
        reviewedByPanelUserId: input.panelUserId,
        reviewedAt: ahora,
        rejectionReason: input.reason.trim(),
      },
    });

    const quedanPendientes = await tx.paymentProof.count({
      where: { reservationId: reserva.id, status: "PENDIENTE" },
    });

    if (reserva.status === "EN_VALIDACION" && quedanPendientes === 0) {
      const destino = reserva.paidUsd.greaterThan(ZERO) ? "ABONADA" : "PENDIENTE_PAGO";
      await transitionReservation(
        {
          reservationId: reserva.id,
          to: destino,
          actor: { type: "PANEL", panelUserId: input.panelUserId },
          reason: input.reason.trim(),
          now: ahora,
        },
        tx,
      );
    }

    await writeAudit(tx, {
      actorType: "PANEL",
      actorPanelUserId: input.panelUserId,
      entityType: "PaymentProof",
      entityId: comprobante.id,
      action: "PAGO_RECHAZADO",
      after: { motivo: input.reason.trim() },
    });

    await enqueueMessage(tx, {
      reservationId: reserva.id,
      phone: reserva.account.phone,
      templateKey: "pago_rechazado",
      payload: {
        nombre: reserva.account.fullName,
        serial: reserva.code,
        motivo: input.reason.trim(),
      },
    });
  });
}

export interface CashPaymentInput {
  reservationId: string;
  panelUserId: string;
  agencyId: string;
  amount: string;
  currency: Currency;
  now?: Date;
}

/** Cobro en efectivo registrado en taquilla o al abordar. */
export async function registerCashPayment(
  input: CashPaymentInput,
): Promise<{ shouldIssueTicket: boolean }> {
  const ahora = input.now ?? new Date();
  const monto = toDecimal(input.amount);
  if (monto.lessThanOrEqualTo(0)) {
    throw new ValidationError("El monto cobrado debe ser mayor que cero.");
  }

  return prisma.$transaction(async (tx) => {
    const reserva = await tx.reservation.findUniqueOrThrow({
      where: { id: input.reservationId },
      include: {
        account: true,
        departure: { include: { route: true } },
      },
    });
    if (reserva.departure.route.agencyId !== input.agencyId) {
      throw new ForbiddenError("OPERADOR", "payments.cash");
    }
    if (reserva.status === "PAGADA" || reserva.status === "ABORDADA") {
      return { shouldIssueTicket: false };
    }

    const montoUsd = toUsd(monto, input.currency, reserva.exchangeRateUsed);
    const nuevoPagado = round2(reserva.paidUsd.add(montoUsd));

    await tx.cashPayment.create({
      data: {
        reservationId: reserva.id,
        amount: monto,
        currency: input.currency,
        amountUsd: montoUsd,
        collectedByPanelUserId: input.panelUserId,
        collectedAt: ahora,
      },
    });
    await tx.reservation.update({
      where: { id: reserva.id },
      data: { paidUsd: nuevoPagado },
    });

    const destino = statusAfterPayment(reserva.status, reserva.totalUsd, nuevoPagado);
    let shouldIssueTicket = false;
    if (destino !== reserva.status) {
      const efectos = await transitionReservation(
        {
          reservationId: reserva.id,
          to: destino,
          actor: { type: "PANEL", panelUserId: input.panelUserId },
          now: ahora,
        },
        tx,
      );
      shouldIssueTicket = efectos.shouldIssueTicket;
    }

    await writeAudit(tx, {
      actorType: "PANEL",
      actorPanelUserId: input.panelUserId,
      entityType: "Reservation",
      entityId: reserva.id,
      action: "COBRO_EN_SITIO",
      before: { paidUsd: reserva.paidUsd.toString(), status: reserva.status },
      after: {
        paidUsd: nuevoPagado.toString(),
        status: destino,
        amount: monto.toString(),
        currency: input.currency,
      },
    });

    if (destino === "PAGADA") {
      await enqueueMessage(tx, {
        reservationId: reserva.id,
        phone: reserva.account.phone,
        templateKey: "ticket_emitido",
        payload: {
          nombre: reserva.account.fullName,
          serial: reserva.code,
          salida: formatCaracasDateTime24(reserva.departure.departsAt),
          punto: reserva.departure.route.meetingPoint,
        },
      });
    }

    return { shouldIssueTicket };
  });
}
