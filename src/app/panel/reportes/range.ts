import {
  caracasDayEnd,
  caracasDayStart,
  caracasHourEnd,
  caracasHourStart,
  caracasPeriodRange,
  DASHBOARD_PERIODS,
  formatCaracasDateTime24,
  formatCaracasTime24,
} from "@/lib/time";
import type { DashboardPeriod } from "@/lib/time";

/** Las dos vistas de la página unificada de reportes del panel. */
export type ReportView = "recaudacion" | "movimientos";

/** Traduce el slug de `?vista=` a una vista válida; cualquier otro valor cae en "recaudacion". */
export function reportViewFromSlug(slug: string | undefined): ReportView {
  return slug === "movimientos" ? "movimientos" : "recaudacion";
}

/**
 * Rango resuelto de un reporte, con el `preset` que lo originó: un
 * `DashboardPeriod` viene del acceso rápido de periodo ("hoy" es además el
 * valor por defecto sin parámetros, igual que en el tablero del operador) y
 * "personalizado" viene del formulario de fechas.
 */
export interface ReportRange {
  from: Date;
  to: Date;
  preset: DashboardPeriod | "personalizado";
}

/**
 * `periodFromSlug` no sirve para detectar si vino un periodo válido: devuelve
 * "hoy" también ante un valor desconocido o ausente. Aquí sí importa
 * distinguir "no vino" de "vino un valor inválido", así que se valida contra
 * la lista de periodos válidos.
 */
function isDashboardPeriod(value: string | undefined): value is DashboardPeriod {
  return value !== undefined && (DASHBOARD_PERIODS as readonly string[]).includes(value);
}

/**
 * Resuelve un rango de reporte: el periodo rápido gana sobre cualquier fecha
 * personalizada; sin periodo, se arma el rango personalizado con
 * `buildCustom` si vino algún límite; sin nada de eso, o si el rango
 * personalizado queda invertido, cae "Hoy" (desde las 00:00 hasta ahora).
 */
function resolveRange(
  periodo: string | undefined,
  now: Date,
  hasCustomInput: boolean,
  buildCustom: (defaults: { from: Date; to: Date }) => { from: Date; to: Date },
): ReportRange {
  if (isDashboardPeriod(periodo)) {
    const { from, to } = caracasPeriodRange(periodo, now);
    return { from, to, preset: periodo };
  }

  const defaults = caracasPeriodRange("hoy", now);
  if (hasCustomInput) {
    const { from, to } = buildCustom(defaults);
    if (from <= to) return { from, to, preset: "personalizado" };
  }

  return { from: defaults.from, to: defaults.to, preset: "hoy" };
}

/** Rango de la vista de recaudación: con hora, para acotar dentro del día. */
export function resolveRevenueRange(
  params: { periodo?: string; desde?: string; hasta?: string; horaDesde?: string; horaHasta?: string },
  now: Date = new Date(),
): ReportRange {
  return resolveRange(params.periodo, now, Boolean(params.desde || params.hasta), (defaults) => ({
    from: params.desde ? caracasHourStart(params.desde, params.horaDesde ?? "00", defaults.from) : defaults.from,
    to: params.hasta ? caracasHourEnd(params.hasta, params.horaHasta ?? "23", defaults.to) : defaults.to,
  }));
}

/** Rango de la vista de movimientos: con días completos, sin hora. */
export function resolveMovementsRange(
  params: { periodo?: string; desde?: string; hasta?: string },
  now: Date = new Date(),
): ReportRange {
  return resolveRange(params.periodo, now, Boolean(params.desde || params.hasta), (defaults) => ({
    from: params.desde ? caracasDayStart(params.desde, defaults.from) : defaults.from,
    to: params.hasta ? caracasDayEnd(params.hasta, defaults.to) : defaults.to,
  }));
}

/** Fecha y hora cortas de Caracas en 24 horas: "30/09/2026 14:32". */
function fechaHora(date: Date): string {
  return formatCaracasDateTime24(date);
}

/**
 * Frase llana del rango aplicado, para que siempre se sepa qué periodo se
 * está viendo: "Hoy, de 00:00 a 14:32", "Últimos 7 días, del 24/09/2026 00:00
 * al 30/09/2026 14:32" o "Del 10/09/2026 08:00 al 11/09/2026 18:59". Va sola,
 * sin una etiqueta "Mostrando:" delante, para no encadenar dos dos puntos.
 */
export function describeReportRange(range: ReportRange): string {
  const tramo = `del ${fechaHora(range.from)} al ${fechaHora(range.to)}`;
  switch (range.preset) {
    case "hoy":
      return `Hoy, de ${formatCaracasTime24(range.from)} a ${formatCaracasTime24(range.to)}`;
    case "7d":
      return `Últimos 7 días, ${tramo}`;
    case "30d":
      return `Últimos 30 días, ${tramo}`;
    case "personalizado":
      return `Del ${fechaHora(range.from)} al ${fechaHora(range.to)}`;
  }
}
