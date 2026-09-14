/** Cualquier reserva con su salida incluida, lo mínimo que necesita esta función. */
export interface HasDeparture {
  departure: { departsAt: Date };
}

/**
 * Separa una lista de reservas en "próximas" (`departsAt >= now`) y "pasadas",
 * conservando el orden original dentro de cada grupo. Usada por "Mis viajes"
 * para los dos segmentos de la pantalla.
 */
export function splitByDeparture<T extends HasDeparture>(
  reservas: T[],
  now: Date,
): { proximas: T[]; pasadas: T[] } {
  const proximas: T[] = [];
  const pasadas: T[] = [];
  for (const reserva of reservas) {
    if (reserva.departure.departsAt >= now) {
      proximas.push(reserva);
    } else {
      pasadas.push(reserva);
    }
  }
  return { proximas, pasadas };
}
