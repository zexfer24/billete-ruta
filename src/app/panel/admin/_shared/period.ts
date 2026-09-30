import { z } from "zod";
import {
  caracasDayEnd,
  caracasDayInputValue,
  caracasDayRange,
  caracasDayStart,
  caracasPeriodRange,
  formatCaracasDate,
  formatCaracasTime24,
} from "@/lib/time";
import { last24h } from "@/modules/reports";

/**
 * Periodo de las pantallas del administrador que muestran actividad en el
 * tiempo (tablero y movimientos). Funciones puras: no consultan la base de
 * datos y se prueban en tests/unit/panel/admin-period.test.ts.
 *
 * Contrato de URL: `?periodo=7d|30d|fechas`, y `?from=AAAA-MM-DD&to=AAAA-MM-DD`
 * para las fechas elegidas (los mismos nombres que ya usaban estas páginas).
 * Sin nada, se muestran las últimas 24 horas.
 */

export type AdminPeriod = "24h" | "7d" | "30d" | "fechas";

export const ADMIN_PERIODS: readonly AdminPeriod[] = ["24h", "7d", "30d", "fechas"];

export const ADMIN_PERIOD_LABELS: Record<AdminPeriod, string> = {
  "24h": "Últimas 24 horas",
  "7d": "7 días",
  "30d": "30 días",
  fechas: "Otras fechas",
};

/** Textos de las pestañas de periodo, en su orden: los usan las pestañas reales y su silueta de carga. */
export const ADMIN_PERIOD_TAB_LABELS: readonly string[] = ADMIN_PERIODS.map((period) => ADMIN_PERIOD_LABELS[period]);

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Un valor de URL que no es una fecha AAAA-MM-DD (o que viene repetido) se descarta sin romper la página. */
const dateParam = z.string().regex(DATE_PATTERN).optional().catch(undefined);

/** Parámetros de periodo de la URL. Nunca lanza: cualquier valor raro cae a `undefined`. */
export const periodParamsSchema = z.object({
  periodo: z.string().optional().catch(undefined),
  from: dateParam,
  to: dateParam,
});

export type PeriodParams = z.infer<typeof periodParamsSchema>;

/** Rango ya resuelto, con los valores para precargar los campos de fecha. */
export interface AdminRange {
  period: AdminPeriod;
  from: Date;
  to: Date;
  /** Día de inicio en Caracas, AAAA-MM-DD, para `<input type="date">`. */
  fromInput: string;
  /** Día final en Caracas, AAAA-MM-DD, para `<input type="date">`. */
  toInput: string;
}

function withInputs(period: AdminPeriod, from: Date, to: Date): AdminRange {
  return { period, from, to, fromInput: caracasDayInputValue(from), toInput: caracasDayInputValue(to) };
}

/**
 * Resuelve el periodo pedido en la URL:
 * - `periodo=7d` o `30d`: los mismos rangos que el tablero del operador.
 * - `periodo=fechas`, o cualquier `from`/`to` válido: días completos en hora
 *   de Caracas. Si falta un extremo se usa el otro; si no hay ninguno, hoy. Si
 *   vienen al revés, se intercambian.
 * - Nada de lo anterior: las últimas 24 horas.
 */
export function resolveAdminRange(
  params: { periodo?: string; from?: string; to?: string },
  now: Date = new Date(),
): AdminRange {
  if (params.periodo === "7d" || params.periodo === "30d") {
    const { from, to } = caracasPeriodRange(params.periodo, now);
    return withInputs(params.periodo, from, to);
  }

  const from = params.from && DATE_PATTERN.test(params.from) ? params.from : undefined;
  const to = params.to && DATE_PATTERN.test(params.to) ? params.to : undefined;

  if (params.periodo === "fechas" || from || to) {
    const today = caracasDayRange(now);
    let start = caracasDayStart(from ?? to ?? "", today.from);
    let end = caracasDayEnd(to ?? from ?? "", today.to);
    if (start > end) {
      // Fechas al revés: se toma el día más temprano como inicio y el más tardío como fin.
      const earlierDay = caracasDayInputValue(end);
      const laterDay = caracasDayInputValue(start);
      start = caracasDayStart(earlierDay, today.from);
      end = caracasDayEnd(laterDay, today.to);
    }
    return withInputs("fechas", start, end);
  }

  const { from: defaultFrom, to: defaultTo } = last24h(now);
  return withInputs("24h", defaultFrom, defaultTo);
}

/** Parámetros de URL que reproducen un rango: vacíos para las últimas 24 horas. */
export function periodQuery(range: AdminRange): Record<string, string> {
  if (range.period === "24h") return {};
  if (range.period === "fechas") return { periodo: "fechas", from: range.fromInput, to: range.toInput };
  return { periodo: range.period };
}

/** Arma una ruta con sus parámetros, omitiendo los vacíos. */
export function withQuery(path: string, params: Record<string, string | undefined | null>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    query.set(key, value);
  }
  const qs = query.toString();
  return qs ? `${path}?${qs}` : path;
}

export interface AdminPeriodTab {
  period: AdminPeriod;
  href: string;
  label: string;
  active: boolean;
}

/**
 * Pestañas de periodo para `PanelTabs`. `keep` son los demás filtros de la
 * página (por ejemplo la agencia), que se conservan al cambiar de periodo.
 * La pestaña "Otras fechas" abre el formulario con las fechas que se estén
 * viendo en ese momento.
 */
export function periodTabs(
  path: string,
  range: AdminRange,
  keep: Record<string, string | undefined> = {},
): AdminPeriodTab[] {
  return ADMIN_PERIODS.map((period) => {
    let params: Record<string, string | undefined>;
    if (period === "24h") params = {};
    else if (period === "fechas") params = { periodo: "fechas", from: range.fromInput, to: range.toInput };
    else params = { periodo: period };
    return {
      period,
      href: withQuery(path, { ...keep, ...params }),
      label: ADMIN_PERIOD_LABELS[period],
      active: range.period === period,
    };
  });
}

/** El rango en palabras: "Desde el 29/09/2026 a las 14:32 hasta ahora", "Del 24/09/2026 al 30/09/2026", "El 30/09/2026". */
export function describeAdminRange(range: AdminRange): string {
  if (range.period === "24h") {
    return `Desde el ${formatCaracasDate(range.from)} a las ${formatCaracasTime24(range.from)} hasta ahora`;
  }
  const fromDay = formatCaracasDate(range.from);
  const toDay = formatCaracasDate(range.to);
  if (fromDay === toDay) return `El ${fromDay}`;
  return `Del ${fromDay} al ${toDay}`;
}

/** ¿El rango abarca más de un día del calendario de Caracas? */
export function spansSeveralDays(range: AdminRange): boolean {
  return range.fromInput !== range.toInput;
}

/**
 * Clave estable del rango para `<Suspense key>`: cambia al elegir otro periodo
 * u otras fechas, pero no con cada segundo que pasa en "Últimas 24 horas".
 */
export function rangeKey(range: AdminRange): string {
  return range.period === "fechas" ? `fechas:${range.fromInput}:${range.toInput}` : range.period;
}
