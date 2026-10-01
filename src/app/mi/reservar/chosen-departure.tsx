import { agencyColor } from "@/lib/brand";
import { minutesUntil } from "@/lib/time";
import { departureWhenLabel, tripDurationLabel, URGENT_DEPARTURE_MINUTES } from "@/components/departure-format";
import { IconClock } from "@/components/icons";
import { whenPhrase } from "@/components/passenger-copy";
import type { DepartureVM } from "./booking-form";

/**
 * La salida ya elegida, en los pasos 2, 3 y 4: destino, origen con la agencia
 * y cuándo sale, con la misma jerarquía y el mismo marco de "elegida" que
 * `DepartureRow`. Sin precio ni puestos libres: el costo ya lo dicen el
 * resumen de abajo y el recibo, y los puestos los dice el paso 2 en palabras
 * ("pueden viajar hasta N personas" o la lista de espera). Así el precio por
 * persona, sin la tasa, no se confunde con el total. Aquí no hay encabezado de día, así que la hora siempre lleva el
 * día ("Sale hoy a las 06:00"), salvo que salga en minutos ("Sale en 15
 * min"). Sin hooks: se usa desde componentes de cliente.
 */
export function ChosenDeparture({ departure, now }: { departure: DepartureVM; now: Date }) {
  const departsAt = new Date(departure.departsAtIso);
  const urgente = minutesUntil(departsAt, now) < URGENT_DEPARTURE_MINUTES;
  const agencia = departure.agencyName.trim();

  return (
    <div className="rounded-tarjeta border border-marca-600 bg-superficie p-4 shadow-1 ring-1 ring-marca-600">
      <p className="break-words text-lg font-bold leading-snug text-tinta">
        <span className="sr-only">Salida elegida: hacia </span>
        {departure.destination}
      </p>
      <p className="break-words text-sm text-tinta-suave">
        Desde {departure.origin}
        {agencia ? (
          <>
            {" · "}
            <span
              aria-hidden="true"
              className="mr-1 inline-block size-2.5 rounded-full align-middle"
              style={{ backgroundColor: agencyColor(departure.agencyId).bg }}
            />
            {agencia}
          </>
        ) : null}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        <p
          className={`tabular flex min-w-0 items-center gap-1.5 text-base ${
            urgente ? "font-bold text-alerta" : "font-semibold text-tinta"
          }`}
        >
          {urgente ? <IconClock aria-hidden="true" className="size-5 shrink-0" /> : null}
          <span className="break-words">
            {urgente ? departureWhenLabel(departsAt, now) : `Sale ${whenPhrase(departsAt, now)}`}
          </span>
        </p>
        <p className="tabular text-sm text-tinta-suave">{tripDurationLabel(departure.estimatedMinutes)}</p>
      </div>
    </div>
  );
}
