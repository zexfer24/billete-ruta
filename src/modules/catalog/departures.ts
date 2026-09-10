import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/modules/audit";
import { ForbiddenError } from "@/modules/auth/permissions";
import { ValidationError } from "@/modules/booking/errors";
import { getAvailabilityMap } from "@/modules/booking/availability";

export interface CreateDepartureInput {
  agencyId: string;
  panelUserId: string;
  routeId: string;
  vehicleId: string;
  driverId: string;
  departsAt: Date;
  capacity?: number;
}

/**
 * Crea una salida. Ruta, vehículo y chofer deben pertenecer a la agencia del
 * operador, y un mismo vehículo no puede tener dos salidas a la misma hora.
 */
export async function createDeparture(
  input: CreateDepartureInput,
): Promise<{ departureId: string }> {
  const [ruta, vehiculo, chofer] = await Promise.all([
    prisma.route.findUniqueOrThrow({ where: { id: input.routeId } }),
    prisma.vehicle.findUniqueOrThrow({ where: { id: input.vehicleId } }),
    prisma.driver.findUniqueOrThrow({ where: { id: input.driverId } }),
  ]);

  if (
    ruta.agencyId !== input.agencyId ||
    vehiculo.agencyId !== input.agencyId ||
    chofer.agencyId !== input.agencyId
  ) {
    throw new ForbiddenError("OPERADOR", "departures.manage");
  }
  if (!vehiculo.active || !chofer.active) {
    throw new ValidationError("El vehículo o el chofer están desactivados.");
  }

  const capacity = input.capacity ?? vehiculo.seatCount;
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > vehiculo.seatCount) {
    throw new ValidationError(
      `La capacidad debe estar entre 1 y ${vehiculo.seatCount}, que es el número de asientos del vehículo.`,
    );
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const salida = await tx.departure.create({
        data: {
          routeId: input.routeId,
          vehicleId: input.vehicleId,
          driverId: input.driverId,
          departsAt: input.departsAt,
          capacity,
        },
      });
      await writeAudit(tx, {
        actorType: "PANEL",
        actorPanelUserId: input.panelUserId,
        entityType: "Departure",
        entityId: salida.id,
        action: "SALIDA_CREADA",
        after: {
          routeId: input.routeId,
          vehicleId: input.vehicleId,
          driverId: input.driverId,
          departsAt: input.departsAt.toISOString(),
          capacity,
        },
      });
      return { departureId: salida.id };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ValidationError(
        "Ese vehículo ya tiene una salida programada a esa misma hora.",
      );
    }
    throw error;
  }
}

export interface AgencyDepartureRow {
  id: string;
  routeName: string;
  origin: string;
  destination: string;
  departsAt: Date;
  status: string;
  capacity: number;
  occupied: number;
  available: number;
  vehiclePlate: string;
  driverName: string;
  hasTripLog: boolean;
  departedAt: Date | null;
  arrivedAt: Date | null;
}

/** Salidas de una agencia con su ocupación, para la pantalla de operaciones. */
export async function listAgencyDepartures(
  agencyId: string,
  filter: { from?: Date; to?: Date; order?: "asc" | "desc" } = {},
): Promise<AgencyDepartureRow[]> {
  const salidas = await prisma.departure.findMany({
    where: {
      route: { agencyId },
      departsAt: {
        gte: filter.from ?? new Date(Date.now() - 24 * 3_600_000),
        ...(filter.to ? { lte: filter.to } : {}),
      },
    },
    include: { route: true, vehicle: true, driver: true, tripLog: true },
    orderBy: { departsAt: filter.order ?? "asc" },
    take: 200,
  });

  const ocupados = await getAvailabilityMap(salidas.map((s) => s.id));

  return salidas.map((salida) => {
    const occupied = ocupados.get(salida.id) ?? 0;
    return {
      id: salida.id,
      routeName: salida.route.name,
      origin: salida.route.origin,
      destination: salida.route.destination,
      departsAt: salida.departsAt,
      status: salida.status,
      capacity: salida.capacity,
      occupied,
      available: salida.capacity - occupied,
      vehiclePlate: salida.vehicle.plate,
      driverName: salida.driver.fullName,
      hasTripLog: salida.tripLog !== null,
      departedAt: salida.tripLog?.departedAt ?? null,
      arrivedAt: salida.tripLog?.arrivedAt ?? null,
    };
  });
}

/** Manifiesto completo de una salida, con todos sus pasajeros. */
export async function getManifest(departureId: string, agencyId: string) {
  const salida = await prisma.departure.findUniqueOrThrow({
    where: { id: departureId },
    include: {
      route: { include: { agency: true } },
      vehicle: true,
      driver: true,
      tripLog: true,
      reservations: {
        include: { passengers: true, account: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (salida.route.agencyId !== agencyId) {
    throw new ForbiddenError("OPERADOR", "departures.manage");
  }
  return salida;
}
