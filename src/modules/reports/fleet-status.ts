import type { DepartureStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { UnitState } from "@/lib/labels";

const SIETE_DIAS_MS = 7 * 24 * 3_600_000;

export interface UnitDeparture {
  id: string;
  status: DepartureStatus;
  departsAt: Date;
  routeName: string;
  origin: string;
  destination: string;
  vehiclePlate: string;
  driverName: string;
  departedAt: Date | null;
  estimatedArrivalAt: Date | null;
}

/** La salida con `status` dado y `departsAt` más antigua, o `null` si no hay ninguna. */
function masAntigua(departures: UnitDeparture[], status: DepartureStatus): UnitDeparture | null {
  const candidatas = departures.filter((d) => d.status === status);
  if (candidatas.length === 0) return null;
  return candidatas.reduce((a, b) => (a.departsAt <= b.departsAt ? a : b));
}

/**
 * Estado operativo de una unidad (chofer o vehículo) a partir de sus salidas.
 * Es una función pura para poder probarla sin base de datos; `agencyFleetStatus`
 * arma sus insumos con una consulta.
 */
export function unitStateOf(
  input: { active: boolean; departures: UnitDeparture[] },
  now: Date,
): { state: UnitState; current: UnitDeparture | null; upcoming: UnitDeparture[] } {
  // Regla 1: el viaje en curso es la salida EN_RUTA más antigua, o si no hay,
  // la MANIFIESTO_CERRADO más antigua.
  const current =
    masAntigua(input.departures, "EN_RUTA") ?? masAntigua(input.departures, "MANIFIESTO_CERRADO");

  // Regla 4: las próximas salidas se calculan siempre, sin importar el estado.
  const upcoming = input.departures
    .filter(
      (d) =>
        d.status === "PROGRAMADA" &&
        now.getTime() <= d.departsAt.getTime() &&
        d.departsAt.getTime() <= now.getTime() + SIETE_DIAS_MS,
    )
    .sort((a, b) => a.departsAt.getTime() - b.departsAt.getTime())
    .slice(0, 3);

  let state: UnitState;
  if (current?.status === "EN_RUTA") {
    // Regla 2: un viaje en curso gana aunque la unidad esté inactiva.
    state = "EN_RUTA";
  } else if (current?.status === "MANIFIESTO_CERRADO") {
    state = "EMBARCANDO";
  } else if (!input.active) {
    // Regla 3: sin viaje en curso, la unidad inactiva está fuera de servicio.
    state = "FUERA_DE_SERVICIO";
  } else if (upcoming.length > 0) {
    // Regla 5.
    state = "ASIGNADO";
  } else {
    state = "DISPONIBLE";
  }

  return { state, current, upcoming };
}

export interface DriverStatusRow {
  id: string;
  fullName: string;
  idNumber: string;
  active: boolean;
  state: UnitState;
  current: UnitDeparture | null;
  upcoming: UnitDeparture[];
  boardingCount: number;
  arrivalCount: number;
}

export interface VehicleStatusRow {
  id: string;
  plate: string;
  brand: string;
  model: string;
  seatCount: number;
  active: boolean;
  state: UnitState;
  current: UnitDeparture | null;
  upcoming: UnitDeparture[];
}

export interface AgencyFleetStatus {
  drivers: DriverStatusRow[];
  vehicles: VehicleStatusRow[];
  vehicleSummary: Record<UnitState, number>;
}

const ORDEN_ESTADO: Record<UnitState, number> = {
  EN_RUTA: 0,
  EMBARCANDO: 1,
  ASIGNADO: 2,
  DISPONIBLE: 3,
  FUERA_DE_SERVICIO: 4,
};

function resumenVacio(): Record<UnitState, number> {
  return { EN_RUTA: 0, EMBARCANDO: 0, ASIGNADO: 0, DISPONIBLE: 0, FUERA_DE_SERVICIO: 0 };
}

/** Estado operativo de choferes y vehículos de una agencia, para el tablero de flota. */
export async function agencyFleetStatus(
  agencyId: string,
  now: Date = new Date(),
): Promise<AgencyFleetStatus> {
  const limiteProximas = new Date(now.getTime() + SIETE_DIAS_MS);

  const [salidas, choferes, vehiculos] = await Promise.all([
    prisma.departure.findMany({
      where: {
        route: { agencyId },
        OR: [
          { status: { in: ["EN_RUTA", "MANIFIESTO_CERRADO"] } },
          { status: "PROGRAMADA", departsAt: { gte: now, lte: limiteProximas } },
        ],
      },
      include: { route: true, vehicle: true, driver: true, tripLog: true },
    }),
    prisma.driver.findMany({ where: { agencyId } }),
    prisma.vehicle.findMany({ where: { agencyId } }),
  ]);

  const idsChoferes = choferes.map((c) => c.id);
  const conteos =
    idsChoferes.length === 0
      ? []
      : await prisma.tripLog.groupBy({
          by: ["driverId"],
          where: { driverId: { in: idsChoferes } },
          _count: { departedAt: true, arrivedAt: true },
        });
  const conteoPorChofer = new Map(conteos.map((c) => [c.driverId, c._count]));

  const salidasPorChofer = new Map<string, UnitDeparture[]>();
  const salidasPorVehiculo = new Map<string, UnitDeparture[]>();
  for (const salida of salidas) {
    const unidad: UnitDeparture = {
      id: salida.id,
      status: salida.status,
      departsAt: salida.departsAt,
      routeName: salida.route.name,
      origin: salida.route.origin,
      destination: salida.route.destination,
      vehiclePlate: salida.vehicle.plate,
      driverName: salida.driver.fullName,
      departedAt: salida.tripLog?.departedAt ?? null,
      estimatedArrivalAt: salida.tripLog?.departedAt
        ? new Date(salida.tripLog.departedAt.getTime() + salida.route.estimatedMinutes * 60_000)
        : null,
    };
    salidasPorChofer.set(salida.driverId, [...(salidasPorChofer.get(salida.driverId) ?? []), unidad]);
    salidasPorVehiculo.set(salida.vehicleId, [
      ...(salidasPorVehiculo.get(salida.vehicleId) ?? []),
      unidad,
    ]);
  }

  const drivers: DriverStatusRow[] = choferes.map((chofer) => {
    const { state, current, upcoming } = unitStateOf(
      { active: chofer.active, departures: salidasPorChofer.get(chofer.id) ?? [] },
      now,
    );
    const conteo = conteoPorChofer.get(chofer.id);
    return {
      id: chofer.id,
      fullName: chofer.fullName,
      idNumber: chofer.idNumber,
      active: chofer.active,
      state,
      current,
      upcoming,
      boardingCount: conteo?.departedAt ?? 0,
      arrivalCount: conteo?.arrivedAt ?? 0,
    };
  });

  const vehicles: VehicleStatusRow[] = vehiculos.map((vehiculo) => {
    const { state, current, upcoming } = unitStateOf(
      { active: vehiculo.active, departures: salidasPorVehiculo.get(vehiculo.id) ?? [] },
      now,
    );
    return {
      id: vehiculo.id,
      plate: vehiculo.plate,
      brand: vehiculo.brand,
      model: vehiculo.model,
      seatCount: vehiculo.seatCount,
      active: vehiculo.active,
      state,
      current,
      upcoming,
    };
  });

  const porEstadoYNombre = (a: { state: UnitState }, b: { state: UnitState }) =>
    ORDEN_ESTADO[a.state] - ORDEN_ESTADO[b.state];
  drivers.sort((a, b) => porEstadoYNombre(a, b) || a.fullName.localeCompare(b.fullName));
  vehicles.sort((a, b) => porEstadoYNombre(a, b) || a.plate.localeCompare(b.plate));

  const vehicleSummary = resumenVacio();
  for (const vehiculo of vehicles) vehicleSummary[vehiculo.state] += 1;

  return { drivers, vehicles, vehicleSummary };
}
