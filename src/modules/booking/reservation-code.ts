import { randomInt } from "node:crypto";
import { caracasParts } from "@/lib/time";

/** Alfabeto sin caracteres ambiguos: se excluyen 0, O, 1 e I. */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const SUFFIX_LENGTH = 4;

export const MAX_PASSENGERS_PER_RESERVATION = 6;

export const RESERVATION_CODE_PATTERN =
  /^TR-\d{4}-[1-6]PAX-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/;

/**
 * Serial del ticket. Ejemplo: TR-0815-4PAX-K7Q2
 * Los cuatro dígitos son mes y día de la salida en hora de Caracas.
 */
export function generateReservationCode(departsAt: Date, passengerCount: number): string {
  if (
    !Number.isInteger(passengerCount) ||
    passengerCount < 1 ||
    passengerCount > MAX_PASSENGERS_PER_RESERVATION
  ) {
    throw new Error("La cantidad de pasajeros debe estar entre 1 y 6");
  }
  const { month, day } = caracasParts(departsAt);
  let sufijo = "";
  for (let i = 0; i < SUFFIX_LENGTH; i += 1) {
    sufijo += ALPHABET[randomInt(ALPHABET.length)];
  }
  return `TR-${month}${day}-${passengerCount}PAX-${sufijo}`;
}
