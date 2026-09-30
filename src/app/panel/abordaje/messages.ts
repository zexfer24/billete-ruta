import { reservationStatusLabel } from "@/lib/labels";

/**
 * Traduce los motivos por los que un ticket no puede abordar (textos de
 * src/modules/trips/boarding.ts) a frases llanas que dicen qué pasa y qué
 * hacer, sin códigos internos como "PAGADA" o "ABONADA". Función pura, sin
 * `"use server"`, para poder probarla y usarla desde las acciones.
 */

/** Motivo del dominio con el estado técnico de la reserva dentro. */
const STATUS_PATTERN = /^La reserva está en estado ([A-Z_]+) y no puede abordar\.?$/;

const SIN_PAGO_COMPLETO = new Set(["PENDIENTE_PAGO", "EN_VALIDACION", "ABONADA"]);
const SIN_EFECTO = new Set(["LIBERADA", "CANCELADA", "NO_SHOW"]);

/** Frases fijas del dominio y su versión para el operador en la puerta del bus. */
const KNOWN_MESSAGES: Record<string, string> = {
  "No existe ninguna reserva con ese serial.":
    "No encontramos ningún ticket con ese código. Revisa que esté bien escrito, con los guiones.",
  "Esa reserva es de otra salida.":
    "Este ticket es de otra salida. Revisa con el pasajero la ruta, el día y la hora de su ticket.",
  "Esa reserva pertenece a otra agencia.": "Este ticket es de otra agencia. El pasajero debe abordar con esa agencia.",
  "Código QR inválido o alterado.":
    "El código QR no se pudo validar. Escribe a mano el código que aparece debajo del QR.",
  "Selecciona al menos un pasajero.": "Marca al menos un pasajero para registrar el abordaje.",
  "Alguno de los pasajeros no pertenece a esta reserva.":
    "Algún pasajero marcado no es de este ticket. Busca el ticket de nuevo e inténtalo otra vez.",
};

/** Mensaje llano del estado de una reserva que no puede abordar. */
function statusReason(status: string): string {
  const label = reservationStatusLabel(status);
  if (status === "ABORDADA") {
    return "Este ticket ya se usó: los pasajeros de esta reserva ya abordaron.";
  }
  if (SIN_PAGO_COMPLETO.has(status)) {
    return `Esta reserva todavía no está pagada completa (estado: ${label}). Cobra lo que falta en Pasajeros y pagos y vuelve a buscar el ticket.`;
  }
  if (SIN_EFECTO.has(status)) {
    return `Esta reserva quedó sin efecto (estado: ${label}). Con este ticket no se puede viajar.`;
  }
  return `Esta reserva no puede abordar (estado: ${label}).`;
}

/** Motivo llano de un rechazo de abordaje; un texto desconocido se devuelve igual. */
export function boardingErrorMessage(raw: string): string {
  const match = STATUS_PATTERN.exec(raw.trim());
  if (match?.[1]) return statusReason(match[1]);
  return KNOWN_MESSAGES[raw.trim()] ?? raw;
}
