/**
 * Conteos de una salida a partir de sus reservas y pasajeros, para la hoja de
 * salida y el escáner de abordaje: cuántos subieron, cuántos faltan, cuántos
 * puestos quedan y qué pasará con cada reserva al registrar la salida. Es la
 * misma regla de `registerDeparture` (src/modules/trips/trip-log.ts) contada
 * de antemano, para decirle al operador las consecuencias en números.
 */

/** Estados de reserva que ya no ocupan puesto ni pueden viajar. */
const SIN_EFECTO = new Set(["LIBERADA", "CANCELADA", "NO_SHOW"]);

/** Reservas pagadas que, sin abordar, quedan como "No se presentó" al registrar la salida. */
const PASAN_A_AUSENTE = new Set(["PAGADA"]);

/**
 * Reservas con pago incompleto que no pueden abordar hasta pagar: el escáner
 * (src/modules/trips/boarding.ts) solo deja subir PAGADA y PAGO_EN_SITIO.
 */
const DEBEN_PAGAR = new Set(["PENDIENTE_PAGO", "EN_VALIDACION", "ABONADA"]);

/** Reservas sin pago completo que se cancelan al registrar la salida si nadie abordó. */
const SE_CANCELAN = new Set(["PAGO_EN_SITIO", "PENDIENTE_PAGO", "EN_VALIDACION", "ABONADA"]);

export interface ManifestSummaryInput {
  capacity: number;
  reservations: ReadonlyArray<{
    status: string;
    passengers: ReadonlyArray<{ boardedAt: Date | null }>;
  }>;
}

export interface ManifestSummary {
  /** Pasajeros que ya subieron. */
  boarded: number;
  /** Pasajeros de reservas vigentes que todavía no subieron. */
  pending: number;
  /** Subieron más los que faltan: lo esperado en el viaje. */
  expected: number;
  /** Puestos que no ocupa ninguna reserva vigente. */
  free: number;
  /** Reservas pagadas que quedarán como "No se presentó" y sus pasajeros. */
  noShowReservations: number;
  noShowPassengers: number;
  /** Reservas sin pago completo que se cancelarán y sus pasajeros. */
  cancelReservations: number;
  cancelPassengers: number;
  /**
   * Pasajeros por abordar cuya reserva todavía debe dinero (pendiente de pago,
   * en validación o abonada): no podrán subir hasta pagar. Parte de `pending`.
   */
  unpaidPassengers: number;
}

/** Cuenta los pasajeros y las consecuencias de registrar la salida. */
export function manifestSummary(input: ManifestSummaryInput): ManifestSummary {
  let boarded = 0;
  let pending = 0;
  let occupied = 0;
  let noShowReservations = 0;
  let noShowPassengers = 0;
  let cancelReservations = 0;
  let cancelPassengers = 0;
  let unpaidPassengers = 0;

  for (const reservation of input.reservations) {
    const total = reservation.passengers.length;
    const subieron = reservation.passengers.filter((p) => p.boardedAt !== null).length;
    boarded += subieron;

    if (SIN_EFECTO.has(reservation.status)) continue;
    occupied += total;

    if (reservation.status === "ABORDADA") continue;
    pending += total - subieron;
    if (DEBEN_PAGAR.has(reservation.status)) unpaidPassengers += total - subieron;

    if (PASAN_A_AUSENTE.has(reservation.status)) {
      noShowReservations += 1;
      noShowPassengers += total;
    } else if (SE_CANCELAN.has(reservation.status)) {
      cancelReservations += 1;
      cancelPassengers += total;
    }
  }

  return {
    boarded,
    pending,
    expected: boarded + pending,
    free: Math.max(0, input.capacity - occupied),
    noShowReservations,
    noShowPassengers,
    cancelReservations,
    cancelPassengers,
    unpaidPassengers,
  };
}

/** `true` si la reserva todavía debe dinero y por eso no puede abordar hasta pagar. */
export function reservationOwesMoney(reservationStatus: string): boolean {
  return DEBEN_PAGAR.has(reservationStatus);
}

export type PassengerBoardingState = "a-bordo" | "por-abordar" | "no-viaja";

/**
 * Situación de abordaje de un pasajero: a bordo si tiene hora de abordaje,
 * sin viaje si su reserva quedó sin efecto o ya se cerró como abordada sin
 * él, y por abordar en cualquier otro caso.
 */
export function passengerBoardingState(reservationStatus: string, boardedAt: Date | null): PassengerBoardingState {
  if (boardedAt) return "a-bordo";
  if (SIN_EFECTO.has(reservationStatus) || reservationStatus === "ABORDADA") return "no-viaja";
  return "por-abordar";
}
