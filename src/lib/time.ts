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

/** Minutos completos que faltan para `date`; negativo si ya pasó. */
export function minutesUntil(date: Date, now: Date = new Date()): number {
  return Math.floor((date.getTime() - now.getTime()) / 60_000);
}

/** Los tres períodos que ofrece el tablero del operador. */
export type DashboardPeriod = "hoy" | "7d" | "30d";

export const DASHBOARD_PERIODS: readonly DashboardPeriod[] = ["hoy", "7d", "30d"];

export const DASHBOARD_PERIOD_LABELS: Record<DashboardPeriod, string> = {
  hoy: "Hoy",
  "7d": "7 días",
  "30d": "30 días",
};

/** Días que cubre cada período, contando el día de hoy. */
const PERIOD_DAYS: Record<DashboardPeriod, number> = { hoy: 1, "7d": 7, "30d": 30 };

/** Traduce el slug de la URL (`?periodo=`) a un `DashboardPeriod`. Usa un `Map`
 * en lugar de un objeto plano por la misma razón que `paymentStateFromSlug`:
 * evita que una clave heredada de `Object.prototype` cuele como período
 * válido. Un slug ausente o desconocido cae en "hoy". */
const SLUG_TO_DASHBOARD_PERIOD = new Map<string, DashboardPeriod>([
  ["hoy", "hoy"],
  ["7d", "7d"],
  ["30d", "30d"],
]);

export function periodFromSlug(slug: string | undefined): DashboardPeriod {
  if (slug === undefined) return "hoy";
  return SLUG_TO_DASHBOARD_PERIOD.get(slug) ?? "hoy";
}

/**
 * Rango de un período del tablero, terminado en `now`. El inicio es el
 * comienzo del día en Caracas de hace (días − 1) días, para que "Hoy" cubra
 * exactamente el día en curso y "7 días" incluya siete días completos.
 */
export function caracasPeriodRange(
  period: DashboardPeriod,
  now: Date = new Date(),
): { from: Date; to: Date } {
  const dias = PERIOD_DAYS[period];
  const inicioBruto = new Date(now.getTime() - (dias - 1) * 86_400_000);
  const from = caracasDayStart(caracasDayInputValue(inicioBruto), now);
  return { from, to: now };
}

/** Rango del día de `now` en Caracas, de inicio a fin. */
export function caracasDayRange(now: Date = new Date()): { from: Date; to: Date } {
  const valor = caracasDayInputValue(now);
  return { from: caracasDayStart(valor, now), to: caracasDayEnd(valor, now) };
}

/** Texto de salida relativa para la línea de tiempo del pasajero. */
export function formatRelativeDeparture(date: Date, now: Date = new Date()): string {
  const diffMs = date.getTime() - now.getTime();
  if (diffMs < 0) return "Salió";
  if (diffMs < 60_000) return "Sale ahora";
  const minutos = minutesUntil(date, now);
  if (minutos < 60) return `Sale en ${minutos} min`;
  if (formatCaracasDate(date) === formatCaracasDate(now)) {
    return `Sale a las ${formatCaracasTime24(date)}`;
  }
  return formatCaracas(date, "dd/MM HH:mm");
}
