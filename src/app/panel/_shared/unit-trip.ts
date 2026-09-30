import type { UnitDeparture } from "@/modules/reports";
import { formatCaracas, formatCaracasDate, formatCaracasTime24 } from "@/lib/time";
import { caracasDayHeading } from "./day-label";

/**
 * Cuántas próximas salidas trae como mucho `unitStateOf` en `upcoming`. Si la
 * lista llega a este tope y no viene el total aparte (`upcomingCount`), no se
 * sabe cuántas hay de verdad y no se da una cifra.
 */
const TOPE_PROXIMAS = 3;

/**
 * Hora en formato de 24 horas si `date` cae en el mismo día que `now` (en
 * Caracas); si no, además de la hora antepone la fecha corta (`dd/MM`), para
 * no mostrar "sale 20:00" o "Salió 09:00" de una salida de otro día sin
 * ninguna pista de a qué día corresponde (ver hallazgo V2 de la ronda 4).
 */
function formatInstant(date: Date, now: Date): string {
  return formatCaracasDate(date) === formatCaracasDate(now)
    ? formatCaracasTime24(date)
    : formatCaracas(date, "dd/MM HH:mm");
}

/**
 * Día y hora de una próxima salida con las mismas palabras que la lista de
 * salidas: "Hoy 11:00", "Mañana 07:00" o "02/10 14:30".
 */
function formatUpcoming(date: Date, now: Date): string {
  const dia = caracasDayHeading(date, now);
  const prefijo = dia === "Hoy" || dia === "Mañana" ? dia : formatCaracas(date, "dd/MM");
  return `${prefijo} ${formatCaracasTime24(date)}`;
}

/** Lo que se agrega a la próxima salida: cuántas más hay en los 7 días, sin inventar una cifra. */
function restantesText(upcoming: readonly UnitDeparture[], upcomingCount: number | undefined): string {
  if (upcomingCount === undefined && upcoming.length >= TOPE_PROXIMAS) return " · y otras salidas en 7 días";
  const restantes = (upcomingCount ?? upcoming.length) - 1;
  if (restantes <= 0) return "";
  return ` · ${restantes === 1 ? "1 salida más" : `${restantes} salidas más`} en 7 días`;
}

/**
 * Descripción textual del viaje en curso o próximas salidas de una unidad
 * (chofer o vehículo), compartida por la tabla de flota y el bloque "Flota
 * en operación" del tablero para no duplicar la lógica entre pantallas.
 *
 * Mismas reglas que ya traía `TripCell` en `src/app/panel/flota/page.tsx`:
 * - En ruta: el título es la ruta y el detalle "Salió HH:mm", con la llegada
 *   estimada si se conoce.
 * - Embarcando: "Embarcando · sale HH:mm".
 * - Sin viaje en curso, con próximas salidas: "Hoy HH:mm", "Mañana HH:mm"
 *   o "dd/MM HH:mm" de la más próxima, con "· N salidas más en 7 días" si hay
 *   más de una. `upcomingCount` es el total real de los 7 días (`upcoming`
 *   puede venir recortada); sin él y con la lista en el tope, se dice "y
 *   otras salidas" sin cifra, para no dar un número falso.
 * - Sin nada que mostrar: `null`.
 *
 * `now` se usa para decidir si una hora mostrada ("sale" o "Salió") lleva
 * también la fecha: la de una salida de otro día se muestra con `dd/MM
 * HH:mm`, nunca solo la hora (ver hallazgo V2 de la ronda 4).
 */
export function describeUnitTrip(
  unit: { current: UnitDeparture | null; upcoming: UnitDeparture[]; upcomingCount?: number },
  now: Date,
): { title: string; detail: string } | null {
  const { current, upcoming, upcomingCount } = unit;

  if (current?.status === "EN_RUTA") {
    const salioInstant = current.departedAt ?? current.departsAt;
    const detail = current.estimatedArrivalAt
      ? `Salió ${formatInstant(salioInstant, now)} · llegada estimada ${formatInstant(current.estimatedArrivalAt, now)}`
      : `Salió ${formatInstant(salioInstant, now)}`;
    return { title: current.routeName, detail };
  }

  if (current?.status === "MANIFIESTO_CERRADO") {
    return {
      title: current.routeName,
      detail: `Embarcando · sale ${formatInstant(current.departsAt, now)}`,
    };
  }

  const proxima = upcoming[0];
  if (proxima) {
    return {
      title: proxima.routeName,
      detail: `${formatUpcoming(proxima.departsAt, now)}${restantesText(upcoming, upcomingCount)}`,
    };
  }

  return null;
}
