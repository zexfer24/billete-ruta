import type { UnitDeparture } from "@/modules/reports";
import { formatCaracas, formatCaracasDate, formatCaracasTime24 } from "@/lib/time";

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
 * Descripción textual del viaje en curso o próximas salidas de una unidad
 * (chofer o vehículo), compartida por la tabla de flota y el bloque "Flota
 * en operación" del tablero para no duplicar la lógica entre pantallas.
 *
 * Mismas reglas que ya traía `TripCell` en `src/app/panel/flota/page.tsx`:
 * - En ruta: el título es la ruta y el detalle "Salió HH:mm", con la llegada
 *   estimada si se conoce.
 * - Embarcando: "Embarcando · sale HH:mm".
 * - Sin viaje en curso, con próximas salidas: "dd/MM HH:mm" de la más
 *   próxima, con "· +N más" si hay más de una.
 * - Sin nada que mostrar: `null`.
 *
 * `now` se usa para decidir si una hora mostrada ("sale" o "Salió") lleva
 * también la fecha: la de una salida de otro día se muestra con `dd/MM
 * HH:mm`, nunca solo la hora (ver hallazgo V2 de la ronda 4).
 */
export function describeUnitTrip(
  unit: { current: UnitDeparture | null; upcoming: UnitDeparture[] },
  now: Date,
): { title: string; detail: string } | null {
  const { current, upcoming } = unit;

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
    const restantes = upcoming.length - 1;
    return {
      title: proxima.routeName,
      detail: `${formatCaracas(proxima.departsAt, "dd/MM HH:mm")}${restantes > 0 ? ` · +${restantes} más` : ""}`,
    };
  }

  return null;
}
