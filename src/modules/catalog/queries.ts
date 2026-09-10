import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAvailabilityMap } from "@/modules/booking/availability";

export interface BookableDeparture {
  id: string;
  routeId: string;
  routeName: string;
  agencyId: string;
  agencyName: string;
  origin: string;
  destination: string;
  meetingPoint: string;
  estimatedMinutes: number;
  departsAt: Date;
  fareUsd: Prisma.Decimal;
  capacity: number;
  occupied: number;
  available: number;
  unitLabel: string;
}

export interface DepartureFilter {
  agencyId?: string;
  routeId?: string;
  origin?: string;
  destination?: string;
  from?: Date;
  to?: Date;
  onlyWithSeats?: boolean;
}

/** Salidas que todavía admiten reservas, con su disponibilidad ya calculada. */
export async function listBookableDepartures(
  filter: DepartureFilter = {},
  now: Date = new Date(),
): Promise<BookableDeparture[]> {
  const salidas = await prisma.departure.findMany({
    where: {
      status: "PROGRAMADA",
      departsAt: { gt: filter.from ?? now, ...(filter.to ? { lt: filter.to } : {}) },
      routeId: filter.routeId,
      route: {
        active: true,
        agencyId: filter.agencyId,
        origin: filter.origin ? { contains: filter.origin, mode: "insensitive" } : undefined,
        destination: filter.destination
          ? { contains: filter.destination, mode: "insensitive" }
          : undefined,
        agency: { active: true },
      },
    },
    include: { route: { include: { agency: true } }, vehicle: true },
    orderBy: { departsAt: "asc" },
    take: 200,
  });

  const ocupados = await getAvailabilityMap(salidas.map((s) => s.id));

  const resultado = salidas.map((salida) => {
    const occupied = ocupados.get(salida.id) ?? 0;
    return {
      id: salida.id,
      routeId: salida.routeId,
      routeName: salida.route.name,
      agencyId: salida.route.agencyId,
      agencyName: salida.route.agency.name,
      origin: salida.route.origin,
      destination: salida.route.destination,
      meetingPoint: salida.route.meetingPoint,
      estimatedMinutes: salida.route.estimatedMinutes,
      departsAt: salida.departsAt,
      fareUsd: salida.route.fareUsd,
      capacity: salida.capacity,
      occupied,
      available: salida.capacity - occupied,
      unitLabel: salida.vehicle.plate,
    };
  });

  return filter.onlyWithSeats ? resultado.filter((s) => s.available > 0) : resultado;
}

/** Métodos de pago del terminal más los propios de la agencia indicada. */
export async function listActivePaymentMethods(agencyId?: string) {
  return prisma.paymentMethod.findMany({
    where: {
      active: true,
      OR: [{ agencyId: null }, ...(agencyId ? [{ agencyId }] : [])],
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function listRoutes(agencyId: string) {
  return prisma.route.findMany({
    where: { agencyId },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });
}

export async function listOriginsAndDestinations() {
  const rutas = await prisma.route.findMany({
    where: { active: true, agency: { active: true } },
    select: { origin: true, destination: true },
  });
  return {
    origins: [...new Set(rutas.map((r) => r.origin))].sort((a, b) => a.localeCompare(b, "es")),
    destinations: [...new Set(rutas.map((r) => r.destination))].sort((a, b) =>
      a.localeCompare(b, "es"),
    ),
  };
}
