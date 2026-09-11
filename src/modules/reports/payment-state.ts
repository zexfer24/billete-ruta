import type { Prisma, ReservationStatus } from "@prisma/client";
import { ZERO } from "@/lib/decimal";

export type PaymentState = "Pendiente" | "Abonado" | "Confirmado" | "Sin efecto";

export const PAYMENT_STATES: readonly PaymentState[] = [
  "Pendiente",
  "Abonado",
  "Confirmado",
  "Sin efecto",
];

/** Estados finales con viaje o venta cerrada exitosamente. */
const CONFIRMADO_STATUSES = ["PAGADA", "ABORDADA"] as const satisfies readonly ReservationStatus[];

/** Estados finales sin venta. */
const SIN_EFECTO_STATUSES = [
  "LIBERADA",
  "CANCELADA",
  "NO_SHOW",
] as const satisfies readonly ReservationStatus[];

/** Estados en los que la reserva sigue su curso hacia el pago. */
const ABIERTOS_STATUSES = [
  "PENDIENTE_PAGO",
  "EN_VALIDACION",
  "ABONADA",
  "PAGO_EN_SITIO",
] as const satisfies readonly ReservationStatus[];

/**
 * Estado de pago, tal como lo ve el operador: no es el estado técnico de la
 * reserva sino cuánto se ha pagado. Una reserva en validación sin ningún
 * comprobante aprobado todavía es "Pendiente", no "Abonado": lo que decide
 * no es el saldo restante sino `paidUsd`.
 */
export function paymentStateOf(status: ReservationStatus, paidUsd: Prisma.Decimal): PaymentState {
  if ((CONFIRMADO_STATUSES as readonly ReservationStatus[]).includes(status)) return "Confirmado";
  if ((SIN_EFECTO_STATUSES as readonly ReservationStatus[]).includes(status)) return "Sin efecto";
  return paidUsd.greaterThan(ZERO) ? "Abonado" : "Pendiente";
}

/** El `where` equivalente a `paymentStateOf`, para filtrar en la base de datos. */
export function paymentStateWhere(state: PaymentState): Prisma.ReservationWhereInput {
  switch (state) {
    case "Confirmado":
      return { status: { in: [...CONFIRMADO_STATUSES] } };
    case "Sin efecto":
      return { status: { in: [...SIN_EFECTO_STATUSES] } };
    case "Abonado":
      return { status: { in: [...ABIERTOS_STATUSES] }, paidUsd: { gt: 0 } };
    case "Pendiente":
      return { status: { in: [...ABIERTOS_STATUSES] }, paidUsd: { lte: 0 } };
  }
}
