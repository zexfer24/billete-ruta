import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getEnv } from "@/lib/env";
import { formatCaracasDateTime24 } from "@/lib/time";
import { writeAudit } from "@/modules/audit";
import { enqueueMessage, messageRoute } from "@/modules/messaging";
import { WAITLIST_CLAIM_HOURS, WAITLIST_MIN_LEAD_HOURS } from "@/modules/scheduler";
import { getAvailability } from "./availability";
import { ValidationError } from "./errors";

export interface JoinWaitlistInput {
  departureId: string;
  accountId: string;
  passengerCount: number;
}

export async function joinWaitlist(
  input: JoinWaitlistInput,
): Promise<{ entryId: string }> {
  if (
    !Number.isInteger(input.passengerCount) ||
    input.passengerCount < 1 ||
    input.passengerCount > 6
  ) {
    throw new ValidationError("La cantidad de pasajeros debe estar entre 1 y 6.");
  }

  const existente = await prisma.waitlistEntry.findFirst({
    where: {
      departureId: input.departureId,
      accountId: input.accountId,
      status: { in: ["EN_ESPERA", "NOTIFICADO"] },
    },
  });
  if (existente) {
    throw new ValidationError("Ya estás en la lista de espera de esta salida.");
  }

  const entrada = await prisma.waitlistEntry.create({
    data: {
      departureId: input.departureId,
      accountId: input.accountId,
      passengerCount: input.passengerCount,
    },
  });
  return { entryId: entrada.id };
}

/**
 * Avisa al primero de la cola cuyo grupo cabe en los puestos liberados. No se
 * notifica si la salida es inminente ni si ya hay un aviso vigente sin vencer.
 */
export async function processWaitlist(
  departureId: string,
  now: Date = new Date(),
): Promise<{ notifiedEntryId: string | null }> {
  const salida = await prisma.departure.findUniqueOrThrow({
    where: { id: departureId },
    include: { route: true },
  });

  if (salida.status !== "PROGRAMADA") return { notifiedEntryId: null };

  const horasParaSalida = (salida.departsAt.getTime() - now.getTime()) / 3_600_000;
  if (horasParaSalida < WAITLIST_MIN_LEAD_HOURS) return { notifiedEntryId: null };

  const avisoVigente = await prisma.waitlistEntry.findFirst({
    where: {
      departureId,
      status: "NOTIFICADO",
      claimExpiresAt: { gt: now },
    },
  });
  if (avisoVigente) return { notifiedEntryId: null };

  const disponibilidad = await getAvailability(departureId);
  if (disponibilidad.available < 1) return { notifiedEntryId: null };

  const cola = await prisma.waitlistEntry.findMany({
    where: { departureId, status: "EN_ESPERA" },
    orderBy: { createdAt: "asc" },
    include: { account: true },
  });

  const elegible = cola.find((e) => e.passengerCount <= disponibilidad.available);
  if (!elegible) return { notifiedEntryId: null };

  const claimToken = randomUUID();
  const claimExpiresAt = new Date(now.getTime() + WAITLIST_CLAIM_HOURS * 3_600_000);

  await prisma.$transaction(async (tx) => {
    await tx.waitlistEntry.update({
      where: { id: elegible.id },
      data: { status: "NOTIFICADO", notifiedAt: now, claimToken, claimExpiresAt },
    });
    await writeAudit(tx, {
      actorType: "SISTEMA",
      entityType: "WaitlistEntry",
      entityId: elegible.id,
      action: "LISTA_ESPERA_NOTIFICADA",
      after: { departureId, claimExpiresAt: claimExpiresAt.toISOString() },
    });
    await enqueueMessage(tx, {
      waitlistEntryId: elegible.id,
      phone: elegible.account.phone,
      templateKey: "cupo_disponible_lista_espera",
      payload: {
        nombre: elegible.account.fullName,
        ruta: messageRoute(salida.route),
        salida: formatCaracasDateTime24(salida.departsAt),
        enlace: `${getEnv().PUBLIC_BASE_URL}/lista-espera/${claimToken}`,
        vigencia: `${WAITLIST_CLAIM_HOURS} horas`,
      },
    });
  });

  return { notifiedEntryId: elegible.id };
}

/** Vence los avisos no atendidos y pasa el turno al siguiente de la cola. */
export async function expireWaitlistClaims(now: Date = new Date()): Promise<number> {
  const vencidas = await prisma.waitlistEntry.findMany({
    where: { status: "NOTIFICADO", claimExpiresAt: { lte: now } },
  });
  if (vencidas.length === 0) return 0;

  await prisma.waitlistEntry.updateMany({
    where: { id: { in: vencidas.map((e) => e.id) } },
    data: { status: "EXPIRADO", claimToken: null },
  });

  const salidas = [...new Set(vencidas.map((e) => e.departureId))];
  for (const departureId of salidas) {
    await processWaitlist(departureId, now);
  }
  return vencidas.length;
}

/** Datos de un aviso vigente a partir de su enlace. */
export async function getWaitlistClaim(claimToken: string, now: Date = new Date()) {
  const entrada = await prisma.waitlistEntry.findUnique({
    where: { claimToken },
    include: { departure: { include: { route: true } }, account: true },
  });
  if (!entrada || entrada.status !== "NOTIFICADO") return null;
  if (!entrada.claimExpiresAt || entrada.claimExpiresAt <= now) return null;
  return entrada;
}

export async function markWaitlistConverted(
  entryId: string,
  reservationId: string,
): Promise<void> {
  await prisma.waitlistEntry.update({
    where: { id: entryId },
    data: { status: "CONVERTIDO", convertedReservationId: reservationId, claimToken: null },
  });
}
