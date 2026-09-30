import Link from "next/link";
import type { ReactNode } from "react";
import { agencyColor } from "@/lib/brand";
import { minutesUntil } from "@/lib/time";
import {
  departureWhenLabel,
  formatFareUsd,
  seatsLabel,
  seatsLevel,
  tripDurationLabel,
  URGENT_DEPARTURE_MINUTES,
} from "./departure-format";
import { IconClock } from "./icons";
import { Skeleton } from "./skeleton";

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
  /**
   * El día ya lo dice el título del grupo (por ejemplo "Mañana, jueves 1 de
   * octubre"): la tarjeta dice solo "Sale a las 07:00".
   */
  dayInHeading?: boolean;
}

const SEATS_TONE_CLASSES = {
  agotado: "font-semibold text-peligro",
  pocos: "font-semibold text-alerta",
  normal: "text-tinta-suave",
} as const;

/**
 * Tarjeta de una salida con la misma jerarquía que el tablero de la portada
 * (`DepartureBoard`): el destino como título, debajo "Desde {origen}" con la
 * agencia (su color como pista, nunca solo), y cuándo sale en una frase que
 * se entiende sola ("Sale a las 13:00", "Mañana a las 07:00", "Jue 1 oct a
 * las 07:00", o "Sale en 15 min" resaltado si falta menos de una hora) junto
 * a la duración. A la derecha, precio por persona y puestos libres. Sin
 * hooks: se puede importar desde componentes de cliente.
 */
export function DepartureRow({
  departure,
  now,
  action,
  href,
  selected,
  hideSeats,
  dayInHeading,
}: DepartureRowProps) {
  const urgente = minutesUntil(departure.departsAt, now) < URGENT_DEPARTURE_MINUTES;
  const nivelPuestos = seatsLevel(departure.available);
  const agencia = departure.agencyName.trim();
  const color = agencyColor(departure.agencyId);

  const contenido = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="break-words text-lg font-bold leading-snug text-tinta">
            <span className="sr-only">Hacia </span>
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
                  style={{ backgroundColor: color.bg }}
                />
                {agencia}
              </>
            ) : null}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="tabular text-lg font-bold leading-snug text-tinta">
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

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        <p
          className={`tabular flex min-w-0 items-center gap-1.5 text-base ${
            urgente ? "font-bold text-alerta" : "font-semibold text-tinta"
          }`}
        >
          {urgente ? <IconClock aria-hidden="true" className="size-5 shrink-0" /> : null}
          <span className="break-words">{departureWhenLabel(departure.departsAt, now, { dayInHeading })}</span>
        </p>
        <p className="tabular text-sm text-tinta-suave">{tripDurationLabel(departure.estimatedMinutes)}</p>
      </div>
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

/**
 * Silueta de carga de `DepartureRow`, con sus mismas filas: destino y
 * origen a la izquierda, precio y puestos a la derecha, y la línea de cuándo
 * sale. `withAction` agrega el botón de abajo a la derecha.
 */
export function DepartureRowSkeleton({ withAction = false }: { withAction?: boolean }) {
  return (
    <div aria-hidden="true" className="rounded-tarjeta border border-borde bg-superficie p-4 shadow-1">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-2 pt-1">
          <Skeleton className="h-5 w-2/5 rounded-pastilla" />
          <Skeleton className="h-4 w-4/5 rounded-pastilla" />
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5 pt-1">
          <Skeleton className="h-5 w-20 rounded-pastilla" />
          <Skeleton className="h-4 w-24 rounded-pastilla" />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <Skeleton className="h-5 w-36 rounded-pastilla" />
        <Skeleton className="h-4 w-24 rounded-pastilla" />
      </div>
      {withAction ? (
        <div className="mt-3 flex justify-end">
          <Skeleton className="h-11 w-24 rounded-pastilla" />
        </div>
      ) : null}
    </div>
  );
}
