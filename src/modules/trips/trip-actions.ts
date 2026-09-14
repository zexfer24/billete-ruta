import type { DepartureStatus } from "@prisma/client";

/** Estado mínimo de una salida necesario para decidir qué botones ofrecer. */
export interface TripActionsInput {
  status: DepartureStatus;
  boardingStartedAt: Date | null;
  departedAt: Date | null;
  arrivedAt: Date | null;
}

/** Qué botones de la hoja de salida tienen sentido según el estado actual. */
export interface TripActionsAvailability {
  startBoarding: boolean;
  registerDeparture: boolean;
  registerArrival: boolean;
}

/**
 * Réplica pura de las reglas de `trip-log.ts`: dado el estado de una salida,
 * indica qué acciones ofrecer en el panel. No consulta la base de datos ni
 * lanza errores; solo describe qué es razonable mostrar.
 */
export function availableTripActions(input: TripActionsInput): TripActionsAvailability {
  const { status, boardingStartedAt, departedAt, arrivedAt } = input;

  const startBoarding =
    status !== "EN_RUTA" &&
    status !== "FINALIZADA" &&
    status !== "CANCELADA" &&
    boardingStartedAt === null;

  const registerDeparture =
    status !== "FINALIZADA" && status !== "CANCELADA" && departedAt === null;

  const registerArrival = status !== "CANCELADA" && departedAt !== null && arrivedAt === null;

  return { startBoarding, registerDeparture, registerArrival };
}
