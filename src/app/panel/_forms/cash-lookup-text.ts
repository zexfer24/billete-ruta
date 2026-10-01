/**
 * Avisos de la búsqueda del cobro en efectivo (`findCashReservationAction`).
 * Viven aparte porque un archivo "use server" solo puede exportar funciones
 * asíncronas, y los tests los comparan tal cual.
 */

/** Aviso de búsqueda sin resultado. Una reserva de otra agencia recibe el mismo, para no revelar que existe. */
export const CASH_LOOKUP_NOT_FOUND =
  "No encontramos una reserva con ese código en tu agencia. Revisa que esté bien escrito o busca por la cédula.";

/** Aviso de un texto demasiado corto para ser un código o una cédula. */
export const CASH_LOOKUP_EMPTY = "Escribe el código de la reserva o la cédula del pasajero.";
