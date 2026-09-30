import { formatCaracasTime24 } from "@/lib/time";

/**
 * Movimientos de una salida del día en una sola frase, para "Salidas de hoy".
 * Módulo puro (sin React) para poder probarlo. Solo nombra los hitos que ya
 * ocurrieron ("Embarcó 10:40 · Partió 11:05"); si todavía no hay ninguno lo
 * dice una sola vez, en vez de repetir "Aún no" en cada columna.
 */
export function tripMovementText(departure: {
  status: string;
  boardingStartedAt: Date | null;
  departedAt: Date | null;
  arrivedAt: Date | null;
}): string {
  const hitos = [
    departure.boardingStartedAt && `Embarcó ${formatCaracasTime24(departure.boardingStartedAt)}`,
    departure.departedAt && `Partió ${formatCaracasTime24(departure.departedAt)}`,
    departure.arrivedAt && `Llegó ${formatCaracasTime24(departure.arrivedAt)}`,
  ].filter((hito): hito is string => typeof hito === "string");

  if (hitos.length > 0) return hitos.join(" · ");
  if (departure.status === "CANCELADA") return "No salió";
  return "Todavía no embarca";
}
