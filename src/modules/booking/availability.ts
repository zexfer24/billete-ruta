import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { OCCUPYING_STATUSES } from "./state-machine";

export interface Availability {
  capacity: number;
  occupied: number;
  available: number;
}

/** Puestos libres de una salida, contando solo los estados que ocupan cupo. */
export async function getAvailability(
  departureId: string,
  tx: Prisma.TransactionClient = prisma,
): Promise<Availability> {
  const salida = await tx.departure.findUniqueOrThrow({
    where: { id: departureId },
    select: { capacity: true },
  });
  const agregado = await tx.reservation.aggregate({
    where: { departureId, status: { in: [...OCCUPYING_STATUSES] } },
    _sum: { passengerCount: true },
  });
  const occupied = agregado._sum.passengerCount ?? 0;
  return { capacity: salida.capacity, occupied, available: salida.capacity - occupied };
}

/** Puestos libres de varias salidas en una sola consulta agregada. */
export async function getAvailabilityMap(
  departureIds: string[],
  tx: Prisma.TransactionClient = prisma,
): Promise<Map<string, number>> {
  if (departureIds.length === 0) return new Map();
  const agregados = await tx.reservation.groupBy({
    by: ["departureId"],
    where: { departureId: { in: departureIds }, status: { in: [...OCCUPYING_STATUSES] } },
    _sum: { passengerCount: true },
  });
  const ocupados = new Map(
    agregados.map((fila) => [fila.departureId, fila._sum.passengerCount ?? 0]),
  );
  return ocupados;
}
