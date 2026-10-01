import { formatCaracas } from "@/lib/time";

/**
 * Días y textos del paso 1 de la taquilla (elegir la salida). Módulo puro,
 * sin React, para probarlo con tests unitarios. Los nombres de días y meses
 * van escritos aquí en vez de pedírselos a `Intl`: el servidor y el navegador
 * traen datos de idioma distintos ("oct" o "oct.") y el texto no coincidiría
 * al hidratar la página.
 */

const WEEKDAYS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"] as const;
const WEEKDAYS_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"] as const;
const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
] as const;
const MONTHS_SHORT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"] as const;

const DAY_MS = 86_400_000;

/** Clave del día de Caracas de una fecha: "2026-09-30". */
export function dayKey(date: Date): string {
  return formatCaracas(date, "yyyy-MM-dd");
}

/** "Hoy", "Mañana" o nada, según el día de Caracas. */
function relativeDay(date: Date, now: Date): "Hoy" | "Mañana" | null {
  const dia = dayKey(date);
  if (dia === dayKey(now)) return "Hoy";
  if (dia === dayKey(new Date(now.getTime() + DAY_MS))) return "Mañana";
  return null;
}

/** Día de la semana (0 = lunes), número de día y mes (0 = enero) en hora de Caracas. */
function parts(date: Date) {
  return {
    weekday: Number(formatCaracas(date, "i")) - 1,
    day: Number(formatCaracas(date, "d")),
    month: Number(formatCaracas(date, "M")) - 1,
  };
}

/** Título de un grupo de salidas: "Hoy, miércoles 30 de septiembre" o "Viernes 2 de octubre". */
export function dayLabel(date: Date, now: Date): string {
  const { weekday, day, month } = parts(date);
  const texto = `${WEEKDAYS[weekday]} ${day} de ${MONTHS[month]}`;
  const relativo = relativeDay(date, now);
  if (relativo) return `${relativo}, ${texto}`;
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Texto corto de la ficha de un día: "Hoy", "Mañana" o "Vie 2 oct". */
export function dayChipLabel(date: Date, now: Date): string {
  const relativo = relativeDay(date, now);
  if (relativo) return relativo;
  const { weekday, day, month } = parts(date);
  return `${WEEKDAYS_SHORT[weekday]} ${day} ${MONTHS_SHORT[month]}`;
}

/**
 * Texto aún más corto de la ficha para el teléfono: "Hoy", "Mañana" o "Vie 2".
 * Sin el mes: las fichas cubren 7 días, así que el número del día no se
 * confunde, y así caben cuatro por fila.
 */
export function dayChipShortLabel(date: Date, now: Date): string {
  const relativo = relativeDay(date, now);
  if (relativo) return relativo;
  const { weekday, day } = parts(date);
  return `${WEEKDAYS_SHORT[weekday]} ${day}`;
}

export interface DayGroup<T> {
  key: string;
  label: string;
  chipLabel: string;
  /** Versión corta de `chipLabel` para el teléfono ("Vie 2"). */
  chipShortLabel: string;
  items: T[];
}

/** Salidas agrupadas por día de Caracas, en el orden en que llegan (ya vienen por hora). */
export function groupByDay<T extends { departsAtIso: string }>(departures: readonly T[], now: Date): DayGroup<T>[] {
  const grupos: DayGroup<T>[] = [];
  for (const d of departures) {
    const fecha = new Date(d.departsAtIso);
    const key = dayKey(fecha);
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.key === key) {
      ultimo.items.push(d);
    } else {
      grupos.push({
        key,
        label: dayLabel(fecha, now),
        chipLabel: dayChipLabel(fecha, now),
        chipShortLabel: dayChipShortLabel(fecha, now),
        items: [d],
      });
    }
  }
  return grupos;
}

/** Texto sin acentos y en minúsculas, para buscar "merida" y encontrar "Mérida". */
export function normalizeSearch(value: string): string {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

/**
 * Si el nombre de la ruta dice algo más que "origen – destino". Casi siempre
 * lo repite ("Caracas – San Cristóbal" bajo "Caracas → San Cristóbal") y
 * entonces sobra en la tarjeta.
 */
export function routeNameAddsInfo(departure: { routeName: string; origin: string; destination: string }): boolean {
  const limpio = (value: string) =>
    normalizeSearch(value)
      .replace(/[\s\-–—→>/]+/g, " ")
      .trim();
  return limpio(departure.routeName) !== limpio(`${departure.origin} ${departure.destination}`);
}
