import Link from "next/link";
import type { ReactNode } from "react";
import { formatDuration, formatRelativeDeparture, minutesUntil } from "@/lib/time";
import { AgencyBadge } from "./agency-badge";
import { formatFareUsd, seatsLabel, seatsLevel, URGENT_DEPARTURE_MINUTES } from "./departure-format";
import { IconClock } from "./icons";

export interface DepartureRowData {
  id: string;
  agencyId: string;
  agencyName: string;
  origin: string;
  destination: string;
  departsAt: Date;
  estimatedMinutes: number;
  fareUsd: string;
  available: number;
  capacity: number;
}

interface DepartureRowProps {
  departure: DepartureRowData;
  now: Date;
  action?: ReactNode;
  href?: string;
  selected?: boolean;
  /**
   * Oculta los puestos libres, para cuando la cantidad que importa es otra
   * (por ejemplo, los puestos que la lista de espera guardó para la persona).
   */
  hideSeats?: boolean;
}

const SEATS_TONE_CLASSES = {
  agotado: "font-semibold text-peligro",
  pocos: "font-semibold text-alerta",
  normal: "text-tinta-suave",
} as const;

/**
 * Tarjeta de una salida: raíl con el bloque de la agencia y la duración,
 * cuándo sale ("Sale en 15 min" resaltado si falta menos de una hora), precio
 * por persona y puestos libres, y la ruta con la agencia. Sin hooks: se puede
 * importar desde componentes de cliente.
 */
export function DepartureRow({ departure, now, action, href, selected, hideSeats }: DepartureRowProps) {
  const urgente = minutesUntil(departure.departsAt, now) < URGENT_DEPARTURE_MINUTES;
  const nivelPuestos = seatsLevel(departure.available);
  const tieneAgencia = departure.agencyName.trim().length > 0;

  const contenido = (
    <>
      <div className="flex items-center gap-3">
        <span className="size-2 shrink-0 rounded-full bg-borde-control" aria-hidden="true" />
        <span className="h-px flex-1 bg-borde" aria-hidden="true" />
        <AgencyBadge agencyId={departure.agencyId} name={departure.agencyName} size="md" />
        <span className="h-px flex-1 bg-borde" aria-hidden="true" />
        <span className="size-2 shrink-0 rounded-full bg-borde-control" aria-hidden="true" />
        <span className="tabular shrink-0 text-sm text-tinta-suave">
          <span className="sr-only">Duración del viaje: </span>
          {formatDuration(departure.estimatedMinutes)}
        </span>
      </div>

      <div className="mt-3 flex items-start justify-between gap-3">
        <p
          className={`tabular flex min-w-0 items-center gap-1.5 text-base ${
            urgente ? "font-bold text-alerta" : "font-semibold text-tinta"
          }`}
        >
          {urgente ? <IconClock aria-hidden="true" className="size-5 shrink-0" /> : null}
          <span className="break-words">{formatRelativeDeparture(departure.departsAt, now)}</span>
        </p>
        <div className="shrink-0 text-right">
          <p className="tabular text-lg font-bold text-tinta">
            {formatFareUsd(departure.fareUsd)}
            <span className="sr-only"> por persona</span>
          </p>
          {hideSeats ? null : (
            <p className={`tabular text-sm ${SEATS_TONE_CLASSES[nivelPuestos]}`}>
              {seatsLabel(departure.available)}
            </p>
          )}
        </div>
      </div>

      <p className="mt-1 break-words text-sm text-tinta-suave">
        {departure.origin}
        <span aria-hidden="true"> → </span>
        <span className="sr-only"> a </span>
        {departure.destination}
        {tieneAgencia ? ` · ${departure.agencyName}` : null}
      </p>
      {action ? <div className="mt-3 flex flex-wrap justify-end gap-2">{action}</div> : null}
    </>
  );

  const claseTarjeta = [
    "rounded-tarjeta border bg-superficie p-4 shadow-1",
    selected ? "border-marca-600 ring-1 ring-marca-600" : "border-borde",
  ].join(" ");

  if (href && !action) {
    return (
      <Link
        href={href}
        className={`foco block ${claseTarjeta} transition-colors duration-150 ease-out hover:border-marca-200 hover:bg-marca-50/60 motion-reduce:transition-none`}
      >
        {contenido}
      </Link>
    );
  }

  return <div className={claseTarjeta}>{contenido}</div>;
}
