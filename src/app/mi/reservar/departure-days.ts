import { formatInTimeZone } from "date-fns-tz";
import { es } from "date-fns/locale/es";
import { BUSINESS_TZ, caracasDayInputValue, minutesUntil } from "@/lib/time";
import { URGENT_DEPARTURE_MINUTES } from "@/components/departure-format";
import { capitalize } from "@/components/passenger-copy";

/**
 * Reglas puras del paso 1 del asistente de reserva: las salidas se ven de a
 * un día por vez, elegido con una fila de pastillas ("Hoy", "Mañana",
 * "Jue 2"…) construida solo con los días que tienen salidas. Sin JSX, para
 * probarlas en los tests unitarios.
 */

/** Valor de `?dia=` en la URL: el día en hora de Caracas, "2026-10-01". */
export const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Salidas que se muestran de entrada en un día; el resto, tras "Ver N salidas más". */
export const DAY_INITIAL_LIMIT = 8;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Día de una fecha en hora de Caracas, en el formato de `?dia=`. */
export function caracasDayKey(date: Date): string {
  return caracasDayInputValue(date);
}

export interface DepartureDay {
  /** "2026-10-01". */
  key: string;
  /** Texto de la pastilla: "Hoy", "Mañana" o "Jue 2". */
  label: string;
  /** Título de la lista del día: "Mañana, jueves 1 de octubre". */
  heading: string;
  /** Salidas de ese día. */
  count: number;
}

/**
 * Días con salidas, en orden, con su pastilla y su título. Caracas no cambia
 * de hora en el año, así que "mañana" es sumar un día.
 */
export function listDepartureDays(departures: readonly { departsAtIso: string }[], now: Date): DepartureDay[] {
  const hoy = caracasDayKey(now);
  const manana = caracasDayKey(new Date(now.getTime() + DAY_MS));
  const porDia = new Map<string, { sample: Date; count: number }>();
  for (const d of departures) {
    const fecha = new Date(d.departsAtIso);
    const key = caracasDayKey(fecha);
    const actual = porDia.get(key);
    if (actual) actual.count += 1;
    else porDia.set(key, { sample: fecha, count: 1 });
  }
  return [...porDia.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, { sample, count }]) => {
      const largo = formatInTimeZone(sample, BUSINESS_TZ, "EEEE d 'de' MMMM", { locale: es });
      if (key === hoy) return { key, label: "Hoy", heading: `Hoy, ${largo}`, count };
      if (key === manana) return { key, label: "Mañana", heading: `Mañana, ${largo}`, count };
      return {
        key,
        label: capitalize(formatInTimeZone(sample, BUSINESS_TZ, "EEE d", { locale: es })),
        heading: capitalize(largo),
        count,
      };
    });
}

/** El día pedido si tiene salidas; si no, el primero que tenga. `null` si no hay ninguno. */
export function pickDay(days: readonly DepartureDay[], wanted: string | null | undefined): string | null {
  if (wanted && days.some((day) => day.key === wanted)) return wanted;
  return days[0]?.key ?? null;
}

/**
 * Salidas de un día en el orden en que se muestran: las que salen en menos
 * de una hora en su propio grupo arriba ("Salen pronto"), y dentro de cada
 * grupo primero las que tienen puestos y al final las llenas (con su lista
 * de espera), cada parte por hora de salida.
 */
export function orderDayDepartures<T extends { departsAtIso: string; available: number }>(
  departures: readonly T[],
  now: Date,
): { pronto: T[]; resto: T[] } {
  const porHora = (a: T, b: T) => new Date(a.departsAtIso).getTime() - new Date(b.departsAtIso).getTime();
  const llenasAlFinal = (lista: T[]) => [
    ...lista.filter((d) => d.available > 0).sort(porHora),
    ...lista.filter((d) => d.available <= 0).sort(porHora),
  ];
  const pronto: T[] = [];
  const resto: T[] = [];
  for (const d of departures) {
    (minutesUntil(new Date(d.departsAtIso), now) < URGENT_DEPARTURE_MINUTES ? pronto : resto).push(d);
  }
  return { pronto: llenasAlFinal(pronto), resto: llenasAlFinal(resto) };
}
