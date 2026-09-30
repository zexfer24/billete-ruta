import Link from "next/link";
import type { ReactNode } from "react";
import { agencyColor, agencyInitials } from "@/lib/brand";
import { formatCaracasTime24 } from "@/lib/time";
import {
  departureDayLabel,
  departureUrgencyLabel,
  formatFareUsd,
  seatsLabel,
  seatsLevel,
} from "./departure-format";
import type { DepartureRowData } from "./departure-row";
import { IconBus, IconChevronRight, IconClock } from "./icons";
import { Skeleton } from "./skeleton";
import { EmptyState, Pill } from "./ui";

export interface DepartureBoardProps {
  departures: DepartureRowData[];
  now: Date;
  hrefFor?: (id: string) => string;
  limit?: number;
  /** Nombre de la lista para lectores de pantalla. */
  label?: string;
  /** Título del estado vacío. */
  emptyTitle?: string;
  /** Frase del estado vacío: qué significa y qué se puede hacer. */
  emptyDescription?: ReactNode;
  /** Acción del estado vacío, por ejemplo un enlace para ver otras salidas. */
  emptyAction?: ReactNode;
}

const SEATS_TONE_CLASSES = {
  agotado: "font-semibold text-peligro",
  pocos: "font-semibold text-alerta",
  normal: "text-tinta-suave",
} as const;

/**
 * Tablero de próximas salidas. Cada salida es una tarjeta con el bloque de
 * color de su agencia a la izquierda (hora grande e iniciales), el destino, el
 * origen y la agencia, los puestos libres, el precio por persona y, si se
 * puede tocar, la pista "Reservar". La hora se muestra una sola vez; si falta
 * menos de una hora se agrega "Sale en N min".
 */
export function DepartureBoard({
  departures,
  now,
  hrefFor,
  limit,
  label = "Próximas salidas",
  emptyTitle = "No hay salidas por ahora",
  emptyDescription,
  emptyAction,
}: DepartureBoardProps) {
  const lista = typeof limit === "number" ? departures.slice(0, limit) : departures;

  if (lista.length === 0) {
    return (
      <EmptyState icon={<IconBus />} title={emptyTitle} description={emptyDescription} action={emptyAction} />
    );
  }

  return (
    <ul aria-label={label} className="flex flex-col gap-3">
      {lista.map((departure) => {
        const href = hrefFor?.(departure.id);
        const contenido = <BoardItem departure={departure} now={now} interactive={Boolean(href)} />;
        const claseTarjeta =
          "flex min-h-24 items-stretch overflow-hidden rounded-tarjeta border border-borde bg-superficie shadow-1";

        return (
          <li key={departure.id}>
            {href ? (
              <Link
                href={href}
                className={`foco ${claseTarjeta} transition-colors duration-150 ease-out hover:border-marca-200 hover:bg-marca-50/60 motion-reduce:transition-none`}
              >
                {contenido}
              </Link>
            ) : (
              <div className={claseTarjeta}>{contenido}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function BoardItem({
  departure,
  now,
  interactive,
}: {
  departure: DepartureRowData;
  now: Date;
  interactive: boolean;
}) {
  const color = agencyColor(departure.agencyId);
  const iniciales = agencyInitials(departure.agencyName);
  const dia = departureDayLabel(departure.departsAt, now);
  const urgencia = departureUrgencyLabel(departure.departsAt, now);
  const nivelPuestos = seatsLevel(departure.available);

  return (
    <>
      <div
        className="flex w-20 shrink-0 flex-col items-center justify-center gap-1 px-2 py-3 text-center"
        style={{ backgroundColor: color.bg, color: color.fg }}
      >
        <span className="tabular text-2xl font-bold leading-none">
          <span className="sr-only">Sale a las </span>
          {formatCaracasTime24(departure.departsAt)}
        </span>
        {dia ? <span className="tabular text-sm font-semibold leading-tight">{dia}</span> : null}
        {iniciales ? (
          <span aria-hidden="true" className="text-sm font-bold leading-tight tracking-tight">
            {iniciales}
          </span>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-1 items-center gap-3 p-3 sm:p-4">
        <div className="min-w-0 flex-1">
          <p className="break-words text-lg font-bold leading-snug text-tinta">
            <span className="sr-only">Hacia </span>
            {departure.destination}
          </p>
          <p className="break-words text-sm text-tinta-suave">
            Desde {departure.origin}
            {departure.agencyName ? ` · ${departure.agencyName}` : null}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className={`tabular text-sm ${SEATS_TONE_CLASSES[nivelPuestos]}`}>
              {seatsLabel(departure.available)}
            </span>
            {urgencia ? (
              <Pill tone="alerta" icon={<IconClock />}>
                {urgencia}
              </Pill>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1 text-right">
          <p className="tabular text-lg font-bold leading-tight text-tinta">
            {formatFareUsd(departure.fareUsd)}
            <span className="sr-only"> por persona</span>
          </p>
          {interactive ? (
            <span className="inline-flex items-center gap-0.5 text-sm font-semibold text-marca-700">
              Reservar
              <IconChevronRight aria-hidden="true" className="size-4" />
            </span>
          ) : null}
        </div>
      </div>
    </>
  );
}

/**
 * Silueta de carga del tablero: mismas tarjetas de 96 px con el bloque de la
 * agencia a la izquierda. Va dentro del `SkeletonScreen` de cada pantalla.
 */
export function DepartureBoardSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div aria-hidden="true" className="flex flex-col gap-3">
      {Array.from({ length: Math.max(1, rows) }, (_, index) => (
        <div
          key={index}
          className="flex min-h-24 items-stretch overflow-hidden rounded-tarjeta border border-borde bg-superficie shadow-1"
        >
          <Skeleton className="w-20 shrink-0 rounded-none" />
          <div className="flex min-w-0 flex-1 items-center gap-3 p-3 sm:p-4">
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Skeleton className="h-5 w-3/5 rounded-pastilla" />
              <Skeleton className="h-4 w-4/5 rounded-pastilla" />
              <Skeleton className="h-4 w-2/5 rounded-pastilla" />
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <Skeleton className="h-5 w-16 rounded-pastilla" />
              <Skeleton className="h-4 w-14 rounded-pastilla" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
