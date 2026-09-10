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

/** Duración legible: "4 h 35 min", "2 h", "45 min". */
export function formatDuration(minutes: number): string {
  if (minutes <= 0) return "0 min";
  const horas = Math.floor(minutes / 60);
  const restante = minutes % 60;
  if (horas === 0) return `${restante} min`;
  if (restante === 0) return `${horas} h`;
  return `${horas} h ${restante} min`;
}
