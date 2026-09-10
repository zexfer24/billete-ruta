import { prisma } from "@/lib/prisma";
import { durationMinutes } from "@/lib/time";
import { writeAudit } from "@/modules/audit";
import { ForbiddenError } from "@/modules/auth/permissions";
import { ValidationError } from "@/modules/booking/errors";
import { transitionReservation } from "@/modules/booking/transition";

interface ScopedInput {
  departureId: string;
  panelUserId: string;
  agencyId: string;
  now?: Date;
}

async function loadDeparture(departureId: string, agencyId: string) {
  const salida = await prisma.departure.findUniqueOrThrow({
    where: { id: departureId },
    include: { route: true, tripLog: true },
  });
  if (salida.route.agencyId !== agencyId) {
    throw new ForbiddenError("OPERADOR", "trips.manage");
  }
  return salida;
}

/**
 * Inicia el embarque: cierra el manifiesto para que no entren reservas nuevas y
 * abre el registro de movimiento del chofer.
 */
export async function startBoarding(input: ScopedInput): Promise<{ tripLogId: string }> {
  const ahora = input.now ?? new Date();
  const salida = await loadDeparture(input.departureId, input.agencyId);

  if (salida.status === "EN_RUTA" || salida.status === "FINALIZADA") {
    throw new ValidationError("Esta salida ya partió.");
  }
  if (salida.tripLog?.boardingStartedAt) {
    return { tripLogId: salida.tripLog.id };
  }

  return prisma.$transaction(async (tx) => {
    const registro = await tx.tripLog.upsert({
      where: { departureId: salida.id },
      create: {
        departureId: salida.id,
        driverId: salida.driverId,
        vehicleId: salida.vehicleId,
        boardingStartedAt: ahora,
      },
      update: { boardingStartedAt: ahora },
    });
    await tx.departure.update({
      where: { id: salida.id },
      data: {
        status: "MANIFIESTO_CERRADO",
        manifestClosedAt: ahora,
        manifestClosedByPanelUserId: input.panelUserId,
      },
    });
    await writeAudit(tx, {
      actorType: "PANEL",
      actorPanelUserId: input.panelUserId,
      entityType: "Departure",
      entityId: salida.id,
      action: "EMBARQUE_INICIADO",
      after: { boardingStartedAt: ahora.toISOString() },
    });
    return { tripLogId: registro.id };
  });
}

export interface DepartureResult {
  noShows: number;
  cancelled: number;
  passengerCount: number;
}

/**
 * Registra la hora de salida. Las reservas pagadas que no abordaron quedan como
 * ausentes; las de pago en sitio que nunca pagaron se cancelan.
 */
export async function registerDeparture(input: ScopedInput): Promise<DepartureResult> {
  const ahora = input.now ?? new Date();
  const salida = await loadDeparture(input.departureId, input.agencyId);

  if (salida.status === "FINALIZADA") {
    throw new ValidationError("Esta salida ya finalizó.");
  }
  if (salida.tripLog?.departedAt) {
    throw new ValidationError("La salida de esta unidad ya fue registrada.");
  }

  const reservas = await prisma.reservation.findMany({
    where: {
      departureId: salida.id,
      status: { in: ["PAGADA", "PAGO_EN_SITIO", "ABORDADA", "PENDIENTE_PAGO", "EN_VALIDACION", "ABONADA"] },
    },
  });

  let noShows = 0;
  let cancelled = 0;
  let passengerCount = 0;

  for (const reserva of reservas) {
    if (reserva.status === "ABORDADA") {
      passengerCount += reserva.passengerCount;
      continue;
    }
    if (reserva.status === "PAGADA") {
      await transitionReservation({
        reservationId: reserva.id,
        to: "NO_SHOW",
        actor: { type: "PANEL", panelUserId: input.panelUserId },
        now: ahora,
      });
      noShows += 1;
      continue;
    }
    // Pago en sitio sin cobrar, o reservas que nunca completaron el pago.
    await transitionReservation({
      reservationId: reserva.id,
      to: "CANCELADA",
      actor: { type: "PANEL", panelUserId: input.panelUserId },
      reason: "No abordó y no completó el pago",
      now: ahora,
    });
    cancelled += 1;
  }

  await prisma.$transaction(async (tx) => {
    await tx.tripLog.upsert({
      where: { departureId: salida.id },
      create: {
        departureId: salida.id,
        driverId: salida.driverId,
        vehicleId: salida.vehicleId,
        departedAt: ahora,
        passengerCount,
      },
      update: { departedAt: ahora, passengerCount },
    });
    await tx.departure.update({
      where: { id: salida.id },
      data: { status: "EN_RUTA" },
    });
    await writeAudit(tx, {
      actorType: "PANEL",
      actorPanelUserId: input.panelUserId,
      entityType: "Departure",
      entityId: salida.id,
      action: "SALIDA_REGISTRADA",
      after: {
        departedAt: ahora.toISOString(),
        passengerCount,
        noShows,
        cancelled,
      },
    });
  });

  return { noShows, cancelled, passengerCount };
}

/** Registra la hora de desembarque y cierra el viaje. */
export async function registerArrival(
  input: ScopedInput,
): Promise<{ durationMinutes: number }> {
  const ahora = input.now ?? new Date();
  const salida = await loadDeparture(input.departureId, input.agencyId);

  const registro = salida.tripLog;
  if (!registro?.departedAt) {
    throw new ValidationError("Primero debes registrar la salida de la unidad.");
  }
  if (registro.arrivedAt) {
    throw new ValidationError("La llegada de esta unidad ya fue registrada.");
  }

  const duracion = durationMinutes(registro.departedAt, ahora);

  await prisma.$transaction(async (tx) => {
    await tx.tripLog.update({
      where: { id: registro.id },
      data: { arrivedAt: ahora },
    });
    await tx.departure.update({
      where: { id: salida.id },
      data: { status: "FINALIZADA" },
    });
    await writeAudit(tx, {
      actorType: "PANEL",
      actorPanelUserId: input.panelUserId,
      entityType: "Departure",
      entityId: salida.id,
      action: "LLEGADA_REGISTRADA",
      after: { arrivedAt: ahora.toISOString(), durationMinutes: duracion },
    });
  });

  return { durationMinutes: duracion };
}
