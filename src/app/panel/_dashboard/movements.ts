import { formatCaracasTime24 } from "@/lib/time";

/**
 * Movimientos de una salida del día en una sola frase, para "Salidas de hoy".
 * Módulo puro (sin React) para poder probarlo. Solo nombra los hitos que ya
 * ocurrieron ("Embarcó 10:40 · Partió 11:05"). Si todavía no hay ninguno
 * devuelve `null`: la pastilla de estado ("Programada") ya lo dice, y repetir
 * "Todavía no embarca" en cada fila solo agregaba ruido. Una cancelada sin
 * hitos dice "No salió".
 */
export function tripMovementText(departure: {
  status: string;
  boardingStartedAt: Date | null;
  departedAt: Date | null;
  arrivedAt: Date | null;
}): string | null {
  const hitos = [
    departure.boardingStartedAt && `Embarcó ${formatCaracasTime24(departure.boardingStartedAt)}`,
    departure.departedAt && `Partió ${formatCaracasTime24(departure.departedAt)}`,
    departure.arrivedAt && `Llegó ${formatCaracasTime24(departure.arrivedAt)}`,
  ].filter((hito): hito is string => typeof hito === "string");

  if (hitos.length > 0) return hitos.join(" · ");
  if (departure.status === "CANCELADA") return "No salió";
  return null;
}
