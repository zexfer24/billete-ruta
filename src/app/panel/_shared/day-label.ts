import { caracasDayInputValue, formatCaracas, formatCaracasTime24 } from "@/lib/time";

/**
 * Textos de día y hora en lenguaje llano para las pantallas de salidas y
 * abordaje ("Hoy", "Mañana", "el jueves 02/10 a las 14:30"), siempre en hora
 * de Caracas y en formato de 24 horas. Funciones puras: no dependen del
 * idioma del servidor ni del navegador.
 */

const WEEKDAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"] as const;

/** Día de Caracas de un instante, como "yyyy-MM-dd". Sirve de clave para agrupar. */
export function caracasDayKey(date: Date): string {
  return caracasDayInputValue(date);
}

/** Días de calendario entre dos claves "yyyy-MM-dd" (positivo si `a` es posterior). */
function dayDiff(a: string, b: string): number {
  return Math.round((Date.parse(`${a}T12:00:00Z`) - Date.parse(`${b}T12:00:00Z`)) / 86_400_000);
}

/** Nombre del día de la semana de una clave "yyyy-MM-dd", en minúsculas. */
function weekdayOf(key: string): string {
  return WEEKDAYS[new Date(`${key}T12:00:00Z`).getUTCDay()] ?? "";
}

/** Fecha corta "dd/MM", con el año si no es el mismo que el de `now`. */
function shortDate(date: Date, now: Date): string {
  const sameYear = formatCaracas(date, "yyyy") === formatCaracas(now, "yyyy");
  return formatCaracas(date, sameYear ? "dd/MM" : "dd/MM/yyyy");
}

/**
 * Cabecera de un grupo de salidas por día: "Hoy", "Mañana", "Ayer" o
 * "Jueves 02/10" (con el año si es otro).
 */
export function caracasDayHeading(date: Date, now: Date): string {
  const key = caracasDayKey(date);
  const diff = dayDiff(key, caracasDayKey(now));
  if (diff === 0) return "Hoy";
  if (diff === 1) return "Mañana";
  if (diff === -1) return "Ayer";
  const weekday = weekdayOf(key);
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${shortDate(date, now)}`;
}

/** "a las 14:30", o "a la 01:15" para la una (así se dice en español). */
function atTime(date: Date): string {
  const time = formatCaracasTime24(date);
  return time.startsWith("01:") ? `a la ${time}` : `a las ${time}`;
}

/**
 * Cuándo sale (o salió) una salida, para una frase: "hoy a las 14:30",
 * "mañana a las 06:00", "ayer a las 20:00" o "el jueves 02/10 a las 14:30".
 */
export function departureWhenText(date: Date, now: Date): string {
  const key = caracasDayKey(date);
  const diff = dayDiff(key, caracasDayKey(now));
  if (diff === 0) return `hoy ${atTime(date)}`;
  if (diff === 1) return `mañana ${atTime(date)}`;
  if (diff === -1) return `ayer ${atTime(date)}`;
  return `el ${weekdayOf(key)} ${shortDate(date, now)} ${atTime(date)}`;
}

/** Grupo de elementos de un mismo día de Caracas, en el orden en que llegaron. */
export interface DayGroup<T> {
  key: string;
  heading: string;
  items: T[];
}

/**
 * Agrupa elementos ya ordenados por fecha en bloques por día de Caracas,
 * respetando el orden de entrada (ascendente o descendente).
 */
export function groupByCaracasDay<T>(items: readonly T[], dateOf: (item: T) => Date, now: Date): DayGroup<T>[] {
  const groups: DayGroup<T>[] = [];
  for (const item of items) {
    const date = dateOf(item);
    const key = caracasDayKey(date);
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.items.push(item);
    } else {
      groups.push({ key, heading: caracasDayHeading(date, now), items: [item] });
    }
  }
  return groups;
}

/** Número con el sustantivo en singular o plural: "1 reserva", "3 reservas". */
export function plural(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}
