import type { UnitDeparture } from "@/modules/reports";
import { formatCaracas, formatCaracasTime24 } from "@/lib/time";

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
 * `now` se mantiene en la firma por simetría con `unitStateOf` (que ya
 * calculó `current`/`upcoming` a partir de esa misma referencia de tiempo),
 * aunque esta función no lo necesita: solo da formato a lo que ya llega.
 */
export function describeUnitTrip(
  unit: { current: UnitDeparture | null; upcoming: UnitDeparture[] },
  now: Date,
): { title: string; detail: string } | null {
  void now;
  const { current, upcoming } = unit;

  if (current?.status === "EN_RUTA") {
    const detail = current.estimatedArrivalAt
      ? `Salió ${formatCaracasTime24(current.departedAt ?? current.departsAt)} · llegada estimada ${formatCaracasTime24(current.estimatedArrivalAt)}`
      : `Salió ${formatCaracasTime24(current.departedAt ?? current.departsAt)}`;
    return { title: current.routeName, detail };
  }

  if (current?.status === "MANIFIESTO_CERRADO") {
    return {
      title: current.routeName,
      detail: `Embarcando · sale ${formatCaracasTime24(current.departsAt)}`,
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
