import type { DepartureStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { UnitState } from "@/lib/labels";
import { caracasDayRange } from "@/lib/time";

const SIETE_DIAS_MS = 7 * 24 * 3_600_000;

/**
 * Hasta cuándo una próxima salida deja a la unidad ASIGNADO: lo que queda del
 * día en Caracas o las próximas 12 horas, lo que llegue más lejos (a las 23:00
 * cubre la mañana siguiente). Una unidad activa cuya próxima salida es
 * posterior está libre por ahora (DISPONIBLE), aunque tenga salidas en los
 * próximos 7 días: si no, en una agencia con salidas diarias todas las
 * unidades saldrían siempre "Asignado" y la columna no diría quién está libre.
 */
const VENTANA_ASIGNADO_MS = 12 * 3_600_000;

function finVentanaAsignado(now: Date): number {
  return Math.max(caracasDayRange(now).to.getTime(), now.getTime() + VENTANA_ASIGNADO_MS);
}

/**
 * Cuánto tiempo hacia atrás una salida PROGRAMADA vencida o con el manifiesto
 * cerrado sigue decidiendo el estado de la unidad. Doce horas cubren un atraso
 * real y el cruce de medianoche; una salida más vieja que nadie cerró (por
 * ejemplo, porque el worker no corrió) ya no compromete al bus ni al chofer y
 * no debe dejarlos "Atrasado" para siempre. EN_RUTA no tiene este límite: es
 * un viaje que salió de verdad y lo cierra `registerArrival`.
 */
const VIGENCIA_EN_CURSO_MS = 12 * 3_600_000;

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
  /**
   * Cuándo un operador abrió el embarque (`startBoarding`). Es la única señal
   * de "embarque abierto": el barrido `sweepAutoClose` del worker también deja
   * la salida en MANIFIESTO_CERRADO al pasar su hora, pero solo cierra la
   * venta y no registra embarque. Ausente o `null`: nadie inició el embarque.
   */
  boardingStartedAt?: Date | null;
  /**
   * `true` solo en el `current` que devuelve `unitStateOf` cuando es una salida
   * cuya hora ya pasó, dentro de las últimas 12 horas, y nadie abrió su
   * embarque: sigue PROGRAMADA, o el worker la pasó a MANIFIESTO_CERRADO sin
   * `boardingStartedAt` (ver `isOverdueDeparture`). `describeUnitTrip` la
   * muestra con el mismo aviso que el tablero, por ejemplo "Debía salir a las
   * 13:00", en tono de alerta.
   */
  overdue?: boolean;
}

/** La salida con `departsAt` más antigua de las que cumplen `cumple`, o `null` si no hay ninguna. */
function masAntiguaQue(
  departures: UnitDeparture[],
  cumple: (d: UnitDeparture) => boolean,
): UnitDeparture | null {
  const candidatas = departures.filter(cumple);
  if (candidatas.length === 0) return null;
  return candidatas.reduce((a, b) => (a.departsAt <= b.departsAt ? a : b));
}

/** La salida con `status` dado y `departsAt` más antigua, o `null` si no hay ninguna. */
function masAntigua(departures: UnitDeparture[], status: DepartureStatus): UnitDeparture | null {
  return masAntiguaQue(departures, (d) => d.status === status);
}

/**
 * Salida atrasada: su hora ya pasó y nadie abrió el embarque. Sigue
 * PROGRAMADA (el worker aún no la tomó), o está en MANIFIESTO_CERRADO sin
 * `boardingStartedAt` porque la cerró el barrido `sweepAutoClose` y no un
 * operador. Con el worker activo la segunda es la forma normal de una salida
 * atrasada a los pocos minutos de su hora. No mira la ventana de 12 horas:
 * eso lo decide `unitStateOf`.
 */
export function isOverdueDeparture(
  departure: { status: DepartureStatus; departsAt: Date; boardingStartedAt?: Date | null },
  now: Date,
): boolean {
  if (departure.departsAt.getTime() > now.getTime()) return false;
  if (departure.status === "PROGRAMADA") return true;
  return departure.status === "MANIFIESTO_CERRADO" && !departure.boardingStartedAt;
}

/**
 * Estado operativo de una unidad (chofer o vehículo) a partir de sus salidas.
 * Es una función pura para poder probarla sin base de datos; `agencyFleetStatus`
 * arma sus insumos con una consulta.
 */
export function unitStateOf(
  input: { active: boolean; departures: UnitDeparture[] },
  now: Date,
): {
  state: UnitState;
  current: UnitDeparture | null;
  upcoming: UnitDeparture[];
  upcomingCount: number;
} {
  // Regla 1: el viaje en curso es la salida EN_RUTA más antigua, o si no hay,
  // la MANIFIESTO_CERRADO más antigua con el embarque abierto, o si no hay, la
  // atrasada más antigua (`isOverdueDeparture`: su hora pasó y nadie abrió el
  // embarque, siga PROGRAMADA o la haya cerrado el worker; así la vista no
  // depende de que el worker corra o no). Las dos últimas solo cuentan dentro
  // de `VIGENCIA_EN_CURSO_MS`: más atrás no deciden nada.
  const corte = now.getTime() - VIGENCIA_EN_CURSO_MS;
  const vigentes = input.departures.filter((d) => d.departsAt.getTime() >= corte);
  const atrasada = masAntiguaQue(vigentes, (d) => isOverdueDeparture(d, now));
  const current =
    masAntigua(input.departures, "EN_RUTA") ??
    masAntiguaQue(
      vigentes,
      (d) => d.status === "MANIFIESTO_CERRADO" && !isOverdueDeparture(d, now),
    ) ??
    (atrasada ? { ...atrasada, overdue: true } : null);

  // Regla 4: las próximas salidas se calculan siempre, sin importar el estado.
  // `upcoming` trae como mucho las 3 primeras; `upcomingCount` es el total real
  // de los 7 días, para que la pantalla no dé una cifra recortada.
  const proximas = input.departures
    .filter(
      (d) =>
        d.status === "PROGRAMADA" &&
        now.getTime() <= d.departsAt.getTime() &&
        d.departsAt.getTime() <= now.getTime() + SIETE_DIAS_MS,
    )
    .sort((a, b) => a.departsAt.getTime() - b.departsAt.getTime());
  const upcomingCount = proximas.length;
  const upcoming = proximas.slice(0, 3);

  let state: UnitState;
  if (current?.status === "EN_RUTA") {
    // Regla 2: un viaje en curso gana aunque la unidad esté inactiva.
    state = "EN_RUTA";
  } else if (current?.overdue) {
    // Su hora ya pasó y nadie abrió el embarque, así que no está "Embarcando"
    // aunque el worker haya cerrado el manifiesto. Está atrasada, y compromete
    // al bus y al chofer aunque la unidad esté inactiva.
    state = "ATRASADO";
  } else if (current?.status === "MANIFIESTO_CERRADO") {
    // Con el embarque abierto la unidad está embarcando, aunque vaya tarde.
    state = "EMBARCANDO";
  } else if (!input.active) {
    // Regla 3: sin viaje en curso, la unidad inactiva está fuera de servicio.
    state = "FUERA_DE_SERVICIO";
  } else if (upcoming[0] && upcoming[0].departsAt.getTime() <= finVentanaAsignado(now)) {
    // Regla 5: asignado solo si la próxima salida es hoy o en las próximas
    // 12 horas (ver `VENTANA_ASIGNADO_MS`).
    state = "ASIGNADO";
  } else {
    state = "DISPONIBLE";
  }

  return { state, current, upcoming, upcomingCount };
}

export interface DriverStatusRow {
  id: string;
  fullName: string;
  idNumber: string;
  active: boolean;
  state: UnitState;
  current: UnitDeparture | null;
  upcoming: UnitDeparture[];
  /** Total de salidas programadas en los próximos 7 días (`upcoming` trae solo 3). */
  upcomingCount: number;
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
  /** Total de salidas programadas en los próximos 7 días (`upcoming` trae solo 3). */
  upcomingCount: number;
}

export interface AgencyFleetStatus {
  drivers: DriverStatusRow[];
  vehicles: VehicleStatusRow[];
  vehicleSummary: Record<UnitState, number>;
}

const ORDEN_ESTADO: Record<UnitState, number> = {
  EN_RUTA: 0,
  ATRASADO: 1,
  EMBARCANDO: 2,
  ASIGNADO: 3,
  DISPONIBLE: 4,
  FUERA_DE_SERVICIO: 5,
};

function resumenVacio(): Record<UnitState, number> {
  return { EN_RUTA: 0, ATRASADO: 0, EMBARCANDO: 0, ASIGNADO: 0, DISPONIBLE: 0, FUERA_DE_SERVICIO: 0 };
}

/** Estado operativo de choferes y vehículos de una agencia, para el tablero de flota. */
export async function agencyFleetStatus(
  agencyId: string,
  now: Date = new Date(),
): Promise<AgencyFleetStatus> {
  const limiteProximas = new Date(now.getTime() + SIETE_DIAS_MS);
  const corte = new Date(now.getTime() - VIGENCIA_EN_CURSO_MS);

  const [salidas, choferes, vehiculos] = await Promise.all([
    prisma.departure.findMany({
      where: {
        route: { agencyId },
        OR: [
          { status: "EN_RUTA" },
          // Misma ventana que `unitStateOf`: una salida vencida hace más de
          // 12 horas no decide el estado y no se trae.
          { status: "MANIFIESTO_CERRADO", departsAt: { gte: corte } },
          { status: "PROGRAMADA", departsAt: { gte: corte, lte: limiteProximas } },
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
      boardingStartedAt: salida.tripLog?.boardingStartedAt ?? null,
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
    const { state, current, upcoming, upcomingCount } = unitStateOf(
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
      upcomingCount,
      boardingCount: conteo?.departedAt ?? 0,
      arrivalCount: conteo?.arrivedAt ?? 0,
    };
  });

  const vehicles: VehicleStatusRow[] = vehiculos.map((vehiculo) => {
    const { state, current, upcoming, upcomingCount } = unitStateOf(
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
      upcomingCount,
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
