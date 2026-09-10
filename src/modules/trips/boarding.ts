import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/modules/audit";
import { ForbiddenError } from "@/modules/auth/permissions";
import { ValidationError } from "@/modules/booking/errors";
import { transitionReservation } from "@/modules/booking/transition";
import { verifyTicketQr } from "@/modules/tickets";

export interface BoardingPassenger {
  id: string;
  fullName: string;
  idNumber: string;
  boardedAt: Date | null;
}

export interface BoardingView {
  reservationId: string;
  code: string;
  status: string;
  holderName: string;
  passengerCount: number;
  totalUsd: string;
  paidUsd: string;
  balanceUsd: string;
  passengers: BoardingPassenger[];
}

/** Estados que permiten subir a la unidad. */
const BOARDABLE = ["PAGADA", "PAGO_EN_SITIO"] as const;

/**
 * Busca una reserva por serial escrito o por el contenido de un QR. Un QR con
 * firma inválida se descarta antes de consultar la base de datos.
 */
export async function findForBoarding(
  departureId: string,
  codeOrQr: string,
  agencyId: string,
): Promise<{ reservation: BoardingView } | { error: string }> {
  const entrada = codeOrQr.trim().toUpperCase();
  let code = entrada;

  if (entrada.includes(".")) {
    const verificado = verifyTicketQr(entrada);
    if (!verificado.valid || !verificado.code) {
      return { error: "Código QR inválido o alterado." };
    }
    code = verificado.code;
  }

  const reserva = await prisma.reservation.findUnique({
    where: { code },
    include: {
      passengers: { orderBy: [{ isHolder: "desc" }, { createdAt: "asc" }] },
      account: true,
      departure: { include: { route: true } },
    },
  });

  if (!reserva) return { error: "No existe ninguna reserva con ese serial." };
  if (reserva.departure.route.agencyId !== agencyId) {
    return { error: "Esa reserva pertenece a otra agencia." };
  }
  if (reserva.departureId !== departureId) {
    return { error: "Esa reserva es de otra salida." };
  }
  if (!(BOARDABLE as readonly string[]).includes(reserva.status)) {
    return {
      error: `La reserva está en estado ${reserva.status} y no puede abordar.`,
    };
  }

  return {
    reservation: {
      reservationId: reserva.id,
      code: reserva.code,
      status: reserva.status,
      holderName: reserva.account.fullName,
      passengerCount: reserva.passengerCount,
      totalUsd: reserva.totalUsd.toString(),
      paidUsd: reserva.paidUsd.toString(),
      balanceUsd: reserva.totalUsd.sub(reserva.paidUsd).toString(),
      passengers: reserva.passengers.map((p) => ({
        id: p.id,
        fullName: p.fullName,
        idNumber: p.idNumber,
        boardedAt: p.boardedAt,
      })),
    },
  };
}

export interface ConfirmBoardingInput {
  reservationId: string;
  passengerIds: string[];
  panelUserId: string;
  agencyId: string;
  now?: Date;
}

/** Marca abordados a los pasajeros indicados y cierra la reserva como abordada. */
export async function confirmBoarding(input: ConfirmBoardingInput): Promise<void> {
  const ahora = input.now ?? new Date();

  const reserva = await prisma.reservation.findUniqueOrThrow({
    where: { id: input.reservationId },
    include: { passengers: true, departure: { include: { route: true } } },
  });
  if (reserva.departure.route.agencyId !== input.agencyId) {
    throw new ForbiddenError("OPERADOR", "boarding.manage");
  }
  if (!(BOARDABLE as readonly string[]).includes(reserva.status)) {
    throw new ValidationError(
      `La reserva está en estado ${reserva.status} y no puede abordar.`,
    );
  }
  if (input.passengerIds.length === 0) {
    throw new ValidationError("Selecciona al menos un pasajero.");
  }
  const propios = new Set(reserva.passengers.map((p) => p.id));
  if (input.passengerIds.some((id) => !propios.has(id))) {
    throw new ValidationError("Alguno de los pasajeros no pertenece a esta reserva.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.passenger.updateMany({
      where: { id: { in: input.passengerIds } },
      data: { boardedAt: ahora, boardedByPanelUserId: input.panelUserId },
    });
    await transitionReservation(
      {
        reservationId: reserva.id,
        to: "ABORDADA",
        actor: { type: "PANEL", panelUserId: input.panelUserId },
        now: ahora,
      },
      tx,
    );
    await writeAudit(tx, {
      actorType: "PANEL",
      actorPanelUserId: input.panelUserId,
      entityType: "Reservation",
      entityId: reserva.id,
      action: "ABORDAJE_REGISTRADO",
      after: { pasajeros: input.passengerIds.length },
    });
  });
}
