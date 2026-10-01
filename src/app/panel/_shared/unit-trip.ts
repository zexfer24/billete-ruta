import type { UnitDeparture } from "@/modules/reports";
import { formatCaracas, formatCaracasDate, formatCaracasTime24 } from "@/lib/time";
import { caracasDayHeading } from "./day-label";
import { departureNotice } from "./departure-notice";
import { arrowRouteName } from "./route-text";

/**
 * Cuántas próximas salidas trae como mucho `unitStateOf` en `upcoming`. La
 * flota siempre manda el total aparte (`upcomingCount`); si algún llamador no
 * lo pasa y la lista llega a este tope, no se sabe cuántas hay de verdad y no
 * se da una cifra.
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
 * Día y hora de una próxima salida con las mismas palabras que las cabeceras
 * de la lista de salidas: "Hoy 11:00", "Mañana 07:00" o "Sábado 03/10 07:00".
 * El día de la semana va delante de la fecha corta para que "03/10" no se lea
 * suelto (ni como 10 de marzo) junto a "Hoy" y "Mañana".
 */
function formatUpcoming(date: Date, now: Date): string {
  return `${caracasDayHeading(date, now)} ${formatCaracasTime24(date)}`;
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
 * El título es la ruta con flecha (`arrowRouteName`), como en el resto del
 * panel. Mismas reglas que ya traía `TripCell` en `src/app/panel/flota/page.tsx`:
 * - En ruta: el título es la ruta y el detalle "Salió HH:mm", con la llegada
 *   estimada si se conoce.
 * - Atrasada (su hora ya pasó y sigue programada, `current.overdue`, o con
 *   el embarque abierto): el detalle es el mismo aviso que la lista de
 *   salidas y el tablero ("Debía salir a las 13:00", "Embarque abierto ·
 *   debía salir a las 13:00") y `late: true`, para que la pantalla lo pinte
 *   en tono de alerta. Gana sobre las próximas salidas: el bus está
 *   comprometido con ella. No se agrega "N salidas más", porque ninguna de
 *   `upcoming` es la que se muestra.
 * - Embarcando: "Embarcando · sale HH:mm".
 * - Sin viaje en curso, con próximas salidas: "Hoy HH:mm", "Mañana HH:mm"
 *   o "Sábado dd/MM HH:mm" de la más próxima, con "· N salidas más en 7 días" si hay
 *   más de una. `upcomingCount` es el total real de los 7 días (`upcoming`
 *   puede venir recortada); sin él y con la lista en el tope, se dice "y
 *   otras salidas" sin cifra, para no dar un número falso.
 * - Sin nada que mostrar: `null`.
 *
 * `now` se usa para decidir si una hora mostrada ("sale" o "Salió") lleva
 * también la fecha: la de una salida de otro día se muestra con `dd/MM
 * HH:mm`, nunca solo la hora (ver hallazgo V2 de la ronda 4).
 */
export interface UnitTripText {
  title: string;
  detail: string;
  /** Solo presente (y `true`) cuando el viaje mostrado está atrasado. */
  late?: true;
}

export function describeUnitTrip(
  unit: { current: UnitDeparture | null; upcoming: UnitDeparture[]; upcomingCount?: number },
  now: Date,
): UnitTripText | null {
  const { current, upcoming, upcomingCount } = unit;

  if (current?.status === "EN_RUTA") {
    const salioInstant = current.departedAt ?? current.departsAt;
    const detail = current.estimatedArrivalAt
      ? `Salió ${formatInstant(salioInstant, now)} · llegada estimada ${formatInstant(current.estimatedArrivalAt, now)}`
      : `Salió ${formatInstant(salioInstant, now)}`;
    return { title: arrowRouteName(current.routeName), detail };
  }

  if (current?.overdue || current?.status === "MANIFIESTO_CERRADO") {
    const aviso = departureNotice(current, now);
    if (aviso?.kind === "atrasada") return { title: arrowRouteName(current.routeName), detail: aviso.text, late: true };
  }

  if (current?.status === "MANIFIESTO_CERRADO") {
    return {
      title: arrowRouteName(current.routeName),
      detail: `Embarcando · sale ${formatInstant(current.departsAt, now)}`,
    };
  }

  const proxima = upcoming[0];
  if (proxima) {
    return {
      title: arrowRouteName(proxima.routeName),
      detail: `${formatUpcoming(proxima.departsAt, now)}${restantesText(upcoming, upcomingCount)}`,
    };
  }

  return null;
}

/**
 * Id de la salida que `describeUnitTrip` muestra cuando es un viaje que pide
 * atención o seguimiento (en ruta, embarcando o atrasado), para enlazar a su
 * hoja desde la flota. `null` si lo mostrado es solo una próxima salida o no
 * hay viaje: ahí no hay nada que resolver.
 */
export function activeTripDepartureId(unit: { current: UnitDeparture | null }): string | null {
  const { current } = unit;
  if (!current) return null;
  if (current.status === "EN_RUTA" || current.status === "MANIFIESTO_CERRADO") return current.id;
  return current.overdue ? current.id : null;
}
