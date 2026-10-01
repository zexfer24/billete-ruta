import { formatRelativeDeparture, minutesUntil } from "@/lib/time";

/**
 * Reglas de "Lo que necesita tu atención" del tablero del operador. Módulo
 * puro (sin React ni base de datos) para poder probarlo con tests unitarios.
 */

/** Ventana, en minutos, en la que una salida programada cuenta como "embarca pronto". */
export const BOARDING_SOON_MINUTES = 120;

/** Cuántas salidas muestra el bloque de atención antes de remitir a la lista completa. */
export const MAX_ATTENTION_DEPARTURES = 3;

/**
 * Por qué una salida pide atención:
 * - `atrasada`: seguía programada y su hora ya pasó sin que se registrara la salida.
 * - `embarcando`: el embarque está abierto (manifiesto cerrado).
 * - `pronto`: está programada y sale dentro de la ventana de `BOARDING_SOON_MINUTES`.
 */
export type AttentionKind = "atrasada" | "embarcando" | "pronto";

export interface AttentionDeparture<T> {
  departure: T;
  kind: AttentionKind;
}

/**
 * Cuánto falta para una salida, para el cuerpo de un aviso cuyo título ya
 * lleva la hora: «Sale en 45 min», «Sale en 1 h 30 min» o «Sale en 2 h». No
 * repite «Sale a las 22:00» debajo de «22:00 · Caracas → Mérida». Por debajo
 * de una hora usa el mismo texto que el resto de la app
 * (`formatRelativeDeparture`).
 */
export function departsInText(departsAt: Date, now: Date): string {
  const minutos = minutesUntil(departsAt, now);
  if (minutos < 60) return formatRelativeDeparture(departsAt, now);
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return resto === 0 ? `Sale en ${horas} h` : `Sale en ${horas} h ${resto} min`;
}

const KIND_ORDER: Record<AttentionKind, number> = { atrasada: 0, embarcando: 1, pronto: 2 };

/**
 * Una salida está atrasada si sigue programada y su hora ya pasó sin que se
 * registrara el embarque ni la partida. La usan el aviso de atención, la
 * tabla de "Salidas de hoy" y la cifra de salidas, para que digan lo mismo.
 */
export function isOverdue(departure: { departsAt: Date; status: string }, now: Date): boolean {
  return departure.status === "PROGRAMADA" && departure.departsAt.getTime() < now.getTime();
}

/**
 * Salidas del día que el operador debe atender ya, de la más urgente a la
 * menos urgente (atrasadas, embarcando y luego las que salen pronto; a igual
 * urgencia, la que sale antes). Las salidas en ruta, finalizadas o canceladas
 * no aparecen: ya no requieren nada en el mostrador.
 */
export function departuresNeedingAttention<T extends { departsAt: Date; status: string }>(
  departures: readonly T[],
  now: Date,
  windowMinutes: number = BOARDING_SOON_MINUTES,
): AttentionDeparture<T>[] {
  const resultado: AttentionDeparture<T>[] = [];

  for (const departure of departures) {
    if (departure.status === "MANIFIESTO_CERRADO") {
      resultado.push({ departure, kind: "embarcando" });
      continue;
    }
    if (departure.status !== "PROGRAMADA") continue;

    if (isOverdue(departure, now)) {
      resultado.push({ departure, kind: "atrasada" });
    } else if (minutesUntil(departure.departsAt, now) <= windowMinutes) {
      resultado.push({ departure, kind: "pronto" });
    }
  }

  return resultado.sort(
    (a, b) =>
      KIND_ORDER[a.kind] - KIND_ORDER[b.kind] ||
      a.departure.departsAt.getTime() - b.departure.departsAt.getTime(),
  );
}

/**
 * Salidas del día para la tabla del tablero: primero las que siguen activas
 * (programadas, embarcando o en ruta) y después las ya cerradas (finalizadas
 * o canceladas), cada grupo por hora de salida. Así las que importan ahora no
 * quedan escondidas detrás de las de la mañana.
 */
export function sortTodayDepartures<T extends { departsAt: Date; status: string }>(
  departures: readonly T[],
): T[] {
  const cerrada = (status: string) => status === "FINALIZADA" || status === "CANCELADA";
  return [...departures].sort(
    (a, b) =>
      Number(cerrada(a.status)) - Number(cerrada(b.status)) ||
      a.departsAt.getTime() - b.departsAt.getTime(),
  );
}
