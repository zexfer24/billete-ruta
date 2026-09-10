import type { ActorType, Prisma, ReservationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/modules/audit";
import { NoSeatsAvailableError } from "./errors";
import { getAvailability } from "./availability";
import { assertTransition, occupiesSeat } from "./state-machine";

export interface TransitionActor {
  type: ActorType;
  panelUserId?: string | null;
  accountId?: string | null;
}

export interface TransitionInput {
  reservationId: string;
  to: ReservationStatus;
  actor: TransitionActor;
  reason?: string;
  now?: Date;
}

export interface TransitionEffects {
  /** El llamador debe emitir el ticket fuera de la transacción. */
  shouldIssueTicket: boolean;
  /** Se liberaron puestos: conviene revisar la lista de espera. */
  freedSeats: boolean;
  from: ReservationStatus;
  to: ReservationStatus;
}

/**
 * Única puerta de entrada para cambiar el estado de una reserva. Valida la
 * transición, protege el cupo y deja rastro en la bitácora. No hace entrada ni
 * salida de archivos ni envía mensajes: devuelve los efectos y el llamador los
 * ejecuta fuera de la transacción.
 */
export async function transitionReservation(
  input: TransitionInput,
  tx?: Prisma.TransactionClient,
): Promise<TransitionEffects> {
  const ejecutar = async (client: Prisma.TransactionClient): Promise<TransitionEffects> => {
    const ahora = input.now ?? new Date();
    const reserva = await client.reservation.findUniqueOrThrow({
      where: { id: input.reservationId },
      select: {
        id: true,
        status: true,
        departureId: true,
        passengerCount: true,
      },
    });

    const desde = reserva.status;
    assertTransition(desde, input.to);

    const ocupabaAntes = occupiesSeat(desde);
    const ocupaDespues = occupiesSeat(input.to);

    // Si la reserva vuelve a ocupar cupo, hay que comprobar que todavía cabe.
    if (!ocupabaAntes && ocupaDespues) {
      await client.$queryRaw`SELECT id FROM "Departure" WHERE id = ${reserva.departureId}::uuid FOR UPDATE`;
      const disponibilidad = await getAvailability(reserva.departureId, client);
      if (disponibilidad.available < reserva.passengerCount) {
        throw new NoSeatsAvailableError(disponibilidad.available);
      }
    }

    const datos: Prisma.ReservationUpdateInput = { status: input.to };
    if (input.to === "CANCELADA") {
      datos.cancelledAt = ahora;
      datos.cancellationReason = input.reason ?? null;
    }
    if (input.to === "LIBERADA") {
      datos.cancellationReason = input.reason ?? null;
    }
    if (input.to === "ABORDADA") {
      datos.boardedAt = ahora;
    }
    if (input.to === "PAGADA") {
      datos.paidAt = ahora;
      datos.expiresAt = null;
    }
    if (input.to === "EN_VALIDACION" || input.to === "ABONADA") {
      datos.expiresAt = null;
    }

    await client.reservation.update({ where: { id: reserva.id }, data: datos });

    await writeAudit(client, {
      actorType: input.actor.type,
      actorPanelUserId: input.actor.panelUserId ?? null,
      actorAccountId: input.actor.accountId ?? null,
      entityType: "Reservation",
      entityId: reserva.id,
      action: `ESTADO_${input.to}`,
      before: { status: desde },
      after: { status: input.to, motivo: input.reason ?? null },
    });

    return {
      shouldIssueTicket: input.to === "PAGADA",
      freedSeats: ocupabaAntes && !ocupaDespues,
      from: desde,
      to: input.to,
    };
  };

  if (tx) return ejecutar(tx);
  return prisma.$transaction(ejecutar);
}
