const MIN = 60_000;

/** Intentos máximos de envío de un mensaje antes de marcarlo como fallido. */
export const MAX_SEND_ATTEMPTS = 5;

/** Una reserva sin ningún pago se libera a las dos horas de creada. */
export const UNPAID_EXPIRY_MINUTES = 120;

/** No se notifica a la lista de espera si la salida es demasiado inminente. */
export const WAITLIST_MIN_LEAD_HOURS = 3;

/** Vigencia del enlace que recibe quien está en lista de espera. */
export const WAITLIST_CLAIM_HOURS = 2;

/**
 * Ventana del recordatorio de 24 horas. Empieza en las 12 horas para recuperar
 * las salidas que quedaron sin aviso si el worker estuvo caído.
 */
export function dueForReminder24h(now: Date): { from: Date; to: Date } {
  return {
    from: new Date(now.getTime() + 12 * 60 * MIN),
    to: new Date(now.getTime() + (24 * 60 + 5) * MIN),
  };
}

/** Corte para liberar reservas de pago en sitio no reconfirmadas. */
export function dueForRelease12h(now: Date): Date {
  return new Date(now.getTime() + 12 * 60 * MIN);
}

/** Ventana de la confirmación de asistencia, con recuperación hasta 30 minutos antes. */
export function dueForConfirmation2h(now: Date): { from: Date; to: Date } {
  return {
    from: new Date(now.getTime() + 30 * MIN),
    to: new Date(now.getTime() + (2 * 60 + 5) * MIN),
  };
}

/** Espera creciente entre reintentos: 1, 4, 16, 64 y 256 minutos. */
export function nextRetryDelayMinutes(attempt: number): number {
  if (!Number.isInteger(attempt) || attempt < 1 || attempt > MAX_SEND_ATTEMPTS) {
    throw new Error(`Intento fuera de rango: ${attempt}`);
  }
  return 4 ** (attempt - 1);
}
