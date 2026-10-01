import Link from "next/link";
import type { ReactNode } from "react";
import { agencyColor } from "@/lib/brand";
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

/** Tarjeta del tablero: bloque de color a la izquierda y los datos a la derecha. */
const CARD_CLASS =
  "flex min-h-24 items-stretch overflow-hidden rounded-tarjeta border border-borde bg-superficie shadow-1";

/**
 * Tablero de próximas salidas. Cada salida es una tarjeta con el bloque de
 * color de su agencia a la izquierda (hora grande y, si no es hoy, el día), el destino, el
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

        return (
          <li key={departure.id}>
            {href ? (
              <Link
                href={href}
                className={`foco ${CARD_CLASS} transition-colors duration-150 ease-out hover:border-marca-200 hover:bg-marca-50/60 motion-reduce:transition-none`}
              >
                {contenido}
              </Link>
            ) : (
              <div className={CARD_CLASS}>{contenido}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Una salida suelta con la tarjeta del tablero, sin enlace: para mostrar la
 * salida guardada en otra pantalla (la lista de espera) igual que en la
 * portada. `hideSeats` oculta los puestos libres cuando la cantidad que
 * importa es otra.
 */
export function DepartureCard({
  departure,
  now,
  hideSeats = false,
}: {
  departure: DepartureRowData;
  now: Date;
  hideSeats?: boolean;
}) {
  return (
    <div className={CARD_CLASS}>
      <BoardItem departure={departure} now={now} interactive={false} hideSeats={hideSeats} />
    </div>
  );
}

function BoardItem({
  departure,
  now,
  interactive,
  hideSeats = false,
}: {
  departure: DepartureRowData;
  now: Date;
  interactive: boolean;
  hideSeats?: boolean;
}) {
  const color = agencyColor(departure.agencyId);
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
      </div>

      <div className="flex min-w-0 flex-1 items-center gap-3 p-3 sm:p-4">
        <div className="min-w-0 flex-1">
          <p className="break-words text-lg font-bold leading-snug text-tinta">
            <span className="sr-only">Hacia </span>
            {departure.destination}
          </p>
          {/*
            En el teléfono la agencia va en su propia línea, sin el punto, para
            que el "·" no quede colgando al final de la primera; desde `sm`
            cabe todo en una línea con el separador.
          */}
          <p className="break-words text-sm text-tinta-suave">
            Desde {departure.origin}
            {departure.agencyName ? (
              <span className="block sm:inline">
                <span className="hidden sm:inline"> · </span>
                <span className="sr-only sm:hidden">, </span>
                {departure.agencyName}
              </span>
            ) : null}
          </p>
          {hideSeats && !urgencia ? null : (
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
              {hideSeats ? null : (
                <span className={`tabular text-sm ${SEATS_TONE_CLASSES[nivelPuestos]}`}>
                  {seatsLabel(departure.available)}
                </span>
              )}
              {urgencia ? (
                <Pill tone="alerta" icon={<IconClock />}>
                  {urgencia}
                </Pill>
              ) : null}
            </div>
          )}
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
 * Silueta de carga del tablero: mismas tarjetas con el bloque de la agencia a
 * la izquierda. En el teléfono miden unos 120 px, porque el origen y la
 * agencia ocupan dos líneas; desde `sm`, 96 px. Va dentro del
 * `SkeletonScreen` de cada pantalla.
 */
export function DepartureBoardSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div aria-hidden="true" className="flex flex-col gap-3">
      {Array.from({ length: Math.max(1, rows) }, (_, index) => (
        <div
          key={index}
          className="flex min-h-30 items-stretch overflow-hidden rounded-tarjeta border border-borde bg-superficie shadow-1 sm:min-h-24"
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
