import { dueForRelease12h } from "./windows";

/**
 * Plazos de pago que se le dicen al pasajero. Son la única fuente de verdad
 * para la app (`src/components/passenger-copy.ts` los reexporta), los avisos
 * (`notices`) y los mensajes (`booking`, `worker`), para que una misma reserva
 * nunca tenga dos horas límite distintas según dónde se lea. No cambian la
 * regla de liberación: la explican.
 */

/** Lo mínimo de una reserva para saber hasta cuándo puede pagar. */
export interface DeadlineInput {
  status: string;
  departsAt: Date;
  expiresAt: Date | null;
  /** Una reserva de taquilla reconfirmada ya no se libera a las 12 horas. */
  reconfirmedAt?: Date | null;
}

/**
 * Hora límite para pagar una reserva y si esa hora la pone la salida del bus
 * (`boundByDeparture`) en vez de la regla de liberación.
 */
export interface PaymentDeadline {
  at: Date;
  boundByDeparture: boolean;
}

/**
 * Hora límite para pagar en la taquilla: la salida menos el mismo plazo con el
 * que el barrido libera el puesto (`dueForRelease12h`), para que lo que se
 * dice y la liberación nunca se desalineen.
 */
export function cashCounterDeadline(departsAt: Date, now: Date): Date {
  const plazoMs = dueForRelease12h(now).getTime() - now.getTime();
  return new Date(departsAt.getTime() - plazoMs);
}

/**
 * Hasta cuándo puede pagar el pasajero sin perder el puesto, o `null` si no
 * corre ningún plazo (ya pagó algo, está en revisión, la reserva no sirve o
 * el plazo ya pasó). Una reserva sin pago vence a las 2 horas de creada, pero
 * nunca después de la salida: si el bus sale antes, el plazo es la salida.
 */
export function paymentDeadline(reserva: DeadlineInput, now: Date): PaymentDeadline | null {
  if (reserva.departsAt <= now) return null;
  if (reserva.status === "PENDIENTE_PAGO") {
    if (!reserva.expiresAt) return null;
    const boundByDeparture = reserva.departsAt < reserva.expiresAt;
    const at = boundByDeparture ? reserva.departsAt : reserva.expiresAt;
    return at > now ? { at, boundByDeparture } : null;
  }
  if (reserva.status === "PAGO_EN_SITIO" && !reserva.reconfirmedAt) {
    const at = cashCounterDeadline(reserva.departsAt, now);
    return at > now ? { at, boundByDeparture: false } : null;
  }
  return null;
}
