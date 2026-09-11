import { formatInTimeZone } from "date-fns-tz";

/** Zona horaria de negocio del terminal. */
export const BUSINESS_TZ = "America/Caracas";

/** Formatea una fecha en hora de Caracas con el patrón indicado. */
export function formatCaracas(date: Date, pattern: string): string {
  return formatInTimeZone(date, BUSINESS_TZ, pattern);
}

/** Fecha y hora completas en formato de 24 horas: 15/08/2026 22:00 */
export function formatCaracasDateTime24(date: Date): string {
  return formatInTimeZone(date, BUSINESS_TZ, "dd/MM/yyyy HH:mm");
}

/** Solo la hora, en formato de 24 horas: 22:00 */
export function formatCaracasTime24(date: Date): string {
  return formatInTimeZone(date, BUSINESS_TZ, "HH:mm");
}

/** Solo la fecha: 15/08/2026 */
export function formatCaracasDate(date: Date): string {
  return formatInTimeZone(date, BUSINESS_TZ, "dd/MM/yyyy");
}

/** Mes y día en hora de Caracas, usados para armar el serial del ticket. */
export function caracasParts(date: Date): { month: string; day: string } {
  return {
    month: formatInTimeZone(date, BUSINESS_TZ, "MM"),
    day: formatInTimeZone(date, BUSINESS_TZ, "dd"),
  };
}

/** Año en hora de Caracas. */
export function caracasYear(date: Date): number {
  return Number.parseInt(formatInTimeZone(date, BUSINESS_TZ, "yyyy"), 10);
}

/** Minutos completos entre dos instantes. Negativo si el orden se invierte. */
export function durationMinutes(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 60_000);
}

/**
 * Valor para un campo <input type="date">, en el día que corresponde en Caracas.
 * Se usa granularidad de día a propósito: un campo datetime-local se dibuja con
 * el formato del navegador y en español muestra "p. m.", que rompe la regla de
 * mostrar siempre las horas en formato de 24 horas.
 */
export function caracasDayInputValue(date: Date): string {
  return formatInTimeZone(date, BUSINESS_TZ, "yyyy-MM-dd");
}

/** Venezuela no aplica horario de verano, así que el desfase es fijo. */
const CARACAS_OFFSET = "-04:00";

/** Instante en que empieza ese día en Caracas. */
export function caracasDayStart(value: string, fallback: Date): Date {
  const fecha = new Date(`${value}T00:00:00.000${CARACAS_OFFSET}`);
  return Number.isNaN(fecha.getTime()) ? fallback : fecha;
}

/** Instante en que termina ese día en Caracas. */
export function caracasDayEnd(value: string, fallback: Date): Date {
  const fecha = new Date(`${value}T23:59:59.999${CARACAS_OFFSET}`);
  return Number.isNaN(fecha.getTime()) ? fallback : fecha;
}

/** Instante en que empieza esa hora del día en Caracas; cae al valor por defecto si la fecha o la hora no son válidas. */
export function caracasHourStart(date: string, hour: string, fallback: Date): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}$/.test(hour)) return fallback;
  const hourValue = Number.parseInt(hour, 10);
  if (hourValue < 0 || hourValue > 23) return fallback;
  const fecha = new Date(`${date}T${hour}:00:00.000${CARACAS_OFFSET}`);
  return Number.isNaN(fecha.getTime()) ? fallback : fecha;
}

/** Instante en que termina esa hora del día en Caracas; cae al valor por defecto si la fecha o la hora no son válidas. */
export function caracasHourEnd(date: string, hour: string, fallback: Date): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}$/.test(hour)) return fallback;
  const hourValue = Number.parseInt(hour, 10);
  if (hourValue < 0 || hourValue > 23) return fallback;
  const fecha = new Date(`${date}T${hour}:59:59.999${CARACAS_OFFSET}`);
  return Number.isNaN(fecha.getTime()) ? fallback : fecha;
}

/** La hora en Caracas como "HH", para precargar los <select> de hora. */
export function caracasHourValue(date: Date): string {
  return formatInTimeZone(date, BUSINESS_TZ, "HH");
}

/** Duración legible: "4 h 35 min", "2 h", "45 min". */
export function formatDuration(minutes: number): string {
  if (minutes <= 0) return "0 min";
  const horas = Math.floor(minutes / 60);
  const restante = minutes % 60;
  if (horas === 0) return `${restante} min`;
  if (restante === 0) return `${horas} h`;
  return `${horas} h ${restante} min`;
}
