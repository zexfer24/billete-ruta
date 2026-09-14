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
  const exhaustivo: never = state;
  throw new Error(`Estado de pago desconocido: ${String(exhaustivo)}`);
}

/** Traduce el slug de la URL (`?pago=`) a un `PaymentState`. Usa un `Map` en
 * lugar de un objeto plano para que claves heredadas de `Object.prototype`
 * (`constructor`, `toString`, `__proto__`, `hasOwnProperty`, …) nunca
 * coincidan; cualquier valor que no sea uno de los cuatro slugs válidos
 * devuelve `undefined`. */
const SLUG_TO_PAYMENT_STATE = new Map<string, PaymentState>([
  ["pendiente", "Pendiente"],
  ["abonado", "Abonado"],
  ["confirmado", "Confirmado"],
  ["sin-efecto", "Sin efecto"],
]);

export function paymentStateFromSlug(slug: string | undefined): PaymentState | undefined {
  if (slug === undefined) return undefined;
  return SLUG_TO_PAYMENT_STATE.get(slug);
}

/**
 * Vistas de la pantalla "Pasajeros y pagos": agrupan reservas por lo que el
 * operador necesita hacer con ellas, no por el estado técnico de la reserva.
 */
export type ReservationView = "por-revisar" | "por-cobrar" | "pagadas" | "sin-efecto" | "todas";

export const RESERVATION_VIEWS: readonly ReservationView[] = [
  "por-revisar",
  "por-cobrar",
  "pagadas",
  "sin-efecto",
  "todas",
];

export const RESERVATION_VIEW_LABELS: Record<ReservationView, string> = {
  "por-revisar": "Por revisar",
  "por-cobrar": "Por cobrar",
  pagadas: "Pagadas",
  "sin-efecto": "Sin efecto",
  todas: "Todas",
};

/** Traduce el slug de la URL (`?vista=`) a un `ReservationView`. Mismo criterio
 * que `paymentStateFromSlug`: un `Map` para que ninguna clave heredada de
 * `Object.prototype` cuele como vista válida. */
const SLUG_TO_RESERVATION_VIEW = new Map<string, ReservationView>([
  ["por-revisar", "por-revisar"],
  ["por-cobrar", "por-cobrar"],
  ["pagadas", "pagadas"],
  ["sin-efecto", "sin-efecto"],
  ["todas", "todas"],
]);

export function reservationViewFromSlug(slug: string | undefined): ReservationView | undefined {
  if (slug === undefined) return undefined;
  return SLUG_TO_RESERVATION_VIEW.get(slug);
}

/** El `where` de cada vista de "Pasajeros y pagos". */
export function reservationViewWhere(view: ReservationView): Prisma.ReservationWhereInput {
  switch (view) {
    case "por-revisar":
      return { proofs: { some: { status: "PENDIENTE" } } };
    case "por-cobrar":
      return { OR: [paymentStateWhere("Pendiente"), paymentStateWhere("Abonado")] };
    case "pagadas":
      return paymentStateWhere("Confirmado");
    case "sin-efecto":
      return paymentStateWhere("Sin efecto");
    case "todas":
      return {};
  }
  const exhaustivo: never = view;
  throw new Error(`Vista de reserva desconocida: ${String(exhaustivo)}`);
}
