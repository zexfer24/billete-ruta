import type { ReservationStatus } from "@prisma/client";

/** Estados que mantienen ocupado un puesto en la salida. */
export const OCCUPYING_STATUSES = [
  "PENDIENTE_PAGO",
  "EN_VALIDACION",
  "ABONADA",
  "PAGADA",
  "PAGO_EN_SITIO",
  "ABORDADA",
] as const satisfies readonly ReservationStatus[];

/**
 * Transiciones permitidas. Ver la sección 8 de la especificación.
 * PAGO_EN_SITIO no llega a NO_SHOW: si nunca pagó, se cancela al registrar la salida.
 */
const TRANSITIONS: Record<ReservationStatus, readonly ReservationStatus[]> = {
  PENDIENTE_PAGO: ["EN_VALIDACION", "LIBERADA", "CANCELADA"],
  EN_VALIDACION: ["ABONADA", "PAGADA", "PENDIENTE_PAGO", "CANCELADA"],
  ABONADA: ["EN_VALIDACION", "PAGADA", "CANCELADA"],
  PAGO_EN_SITIO: ["PAGADA", "LIBERADA", "CANCELADA", "ABORDADA"],
  PAGADA: ["ABORDADA", "NO_SHOW", "CANCELADA"],
  LIBERADA: [],
  CANCELADA: [],
  ABORDADA: [],
  NO_SHOW: [],
};

export class InvalidTransitionError extends Error {
  constructor(
    readonly from: ReservationStatus,
    readonly to: ReservationStatus,
  ) {
    super(`Transición inválida de ${from} a ${to}`);
    this.name = "InvalidTransitionError";
  }
}

export function occupiesSeat(status: ReservationStatus): boolean {
  return (OCCUPYING_STATUSES as readonly ReservationStatus[]).includes(status);
}

export function canTransition(from: ReservationStatus, to: ReservationStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function assertTransition(from: ReservationStatus, to: ReservationStatus): void {
  if (!canTransition(from, to)) throw new InvalidTransitionError(from, to);
}
