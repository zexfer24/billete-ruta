import { formatCaracas, formatCaracasDate, formatCaracasTime24 } from "@/lib/time";

/**
 * Línea de horas de un viaje en las tarjetas del teléfono, la misma en el
 * tablero y en Movimientos. Funciones puras, probadas en
 * tests/unit/panel/admin-trip-hours.test.ts.
 */

/** ¿El viaje llegó otro día del calendario de Caracas que el de su salida? */
export function arrivesAnotherDay(departedAt: Date | null, arrivedAt: Date | null): boolean {
  return Boolean(departedAt && arrivedAt && formatCaracasDate(departedAt) !== formatCaracasDate(arrivedAt));
}

/** "29/09 21:59": el día y la hora juntos, para un viaje que cruza de día. */
function dayAndTime(date: Date): string {
  return `${formatCaracas(date, "dd/MM")} ${formatCaracasTime24(date)}`;
}

/**
 * Piezas de la línea de horas: ["Salió 07:55", "Llegó 16:36"]. Si llega otro
 * día, cada hora lleva su fecha al lado ("Salió 29/09 21:59", "Llegó 30/09
 * 10:21") y la línea de abajo no repite la fecha. Sin salida, la hora del
 * embarque. Cada pieza se pinta entera, sin partirse entre la fecha y la hora.
 */
export function tripHoursParts(
  departedAt: Date | null,
  arrivedAt: Date | null,
  boardingStartedAt: Date | null = null,
): string[] {
  if (!departedAt) {
    return boardingStartedAt ? [`Embarque desde ${formatCaracasTime24(boardingStartedAt)}`] : [];
  }
  if (arrivedAt && arrivesAnotherDay(departedAt, arrivedAt)) {
    return [`Salió ${dayAndTime(departedAt)}`, `Llegó ${dayAndTime(arrivedAt)}`];
  }
  const parts = [`Salió ${formatCaracasTime24(departedAt)}`];
  if (arrivedAt) parts.push(`Llegó ${formatCaracasTime24(arrivedAt)}`);
  return parts;
}
