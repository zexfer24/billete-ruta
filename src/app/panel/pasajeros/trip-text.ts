import { formatCaracasTime24 } from "@/lib/time";
import { caracasDayHeading } from "../_shared/day-label";
import { departureNotice, type DepartureNotice } from "../_shared/departure-notice";
import { departsInText } from "../_dashboard/attention";

/**
 * Textos del viaje en las listas de "Pasajeros y pagos". Módulo puro, sin
 * React, para poder probarlo.
 */

/**
 * Con su salida a menos de estas horas, un comprobante por revisar lleva una
 * pastilla de alerta con cuánto falta ("Sale en 3 h"): si no se revisa a
 * tiempo, el pasajero llega al embarque sin ticket.
 */
export const URGENT_DEPARTURE_HOURS = 6;

/**
 * Aviso de urgencia de un comprobante por revisar, según su salida:
 * - Atrasada (pasó su hora y sigue programada o con el embarque abierto): el
 *   mismo aviso que el tablero y la lista de salidas, "Debía salir a las
 *   21:00" o "Embarque abierto · debía salir a las 21:00". Es el caso más
 *   urgente: el pasajero está en el andén sin ticket.
 * - Dentro de la próxima hora: "Sale en 15 min" (también de `departureNotice`).
 * - Dentro de `URGENT_DEPARTURE_HOURS`: "Sale en 3 h 20 min".
 * - Más lejos, o si la salida ya partió, llegó o se canceló: `null`.
 */
export function proofUrgency(
  departure: { status: string; departsAt: Date },
  now: Date,
): DepartureNotice | null {
  const aviso = departureNotice(departure, now);
  if (aviso) return aviso;
  if (departure.status !== "PROGRAMADA" && departure.status !== "MANIFIESTO_CERRADO") return null;
  const faltaMs = departure.departsAt.getTime() - now.getTime();
  if (faltaMs > URGENT_DEPARTURE_HOURS * 3_600_000) return null;
  return { kind: "pronto", text: departsInText(departure.departsAt, now) };
}

/**
 * Día y hora de la salida en lenguaje llano, con las mismas cabeceras que la
 * lista de salidas: "Hoy 21:00", "Mañana 07:00", "Ayer 23:30" o "Viernes 02/10
 * 19:00". Así lo de hoy se distingue de un vistazo de lo de otro día.
 */
export function tripWhenText(departsAt: Date, now: Date): string {
  return `${caracasDayHeading(departsAt, now)} ${formatCaracasTime24(departsAt)}`;
}

/**
 * Nombre de la ruta con flecha, como en el resto del panel ("Caracas → San
 * Cristóbal"), para las filas que solo traen el nombre libre de la ruta
 * ("Caracas – San Cristóbal"): se cambia el primer guion o raya rodeado de
 * espacios por la flecha. Un nombre sin ese separador queda igual.
 */
export function arrowRouteName(name: string): string {
  return name.replace(/\s+[-‐‑‒–—―]\s+/, " → ");
}
