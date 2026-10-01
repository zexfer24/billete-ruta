"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SearchCard } from "@/components/search-card";
import {
  departureWhenLabel,
  formatFareUsd,
  seatsLabel,
  seatsLevel,
  tripDurationLabel,
  URGENT_DEPARTURE_MINUTES,
} from "@/components/departure-format";
import { EmptyState } from "@/components/ui";
import { buttonClass, cx } from "@/components/ui-classes";
import { IconBus, IconChevronRight, IconClock } from "@/components/icons";
import { agencyColor } from "@/lib/brand";
import { minutesUntil } from "@/lib/time";
import { formatCents, parseCents } from "./money";
import type { DepartureVM } from "./booking-form";
import {
  caracasDayKey,
  DAY_INITIAL_LIMIT,
  listDepartureDays,
  orderDayDepartures,
  pickDay,
} from "./departure-days";

interface StepDeparturesProps {
  departures: DepartureVM[];
  origins: string[];
  destinations: string[];
  origin: string;
  destination: string;
  onChangeFilters: (next: { origin: string; destination: string }) => void;
  /** Día elegido ("2026-10-01"); si no tiene salidas se muestra el primero que tenga. */
  day: string | null;
  onChangeDay: (day: string) => void;
  now: Date;
  selectedDepartureId: string | null;
  taxPerPassengerUsd: string;
  onSelect: (id: string) => void;
}

const SEATS_TONE_CLASSES = {
  agotado: "font-semibold text-peligro",
  pocos: "font-semibold text-alerta",
  normal: "text-tinta-suave",
} as const;

/**
 * Paso 1 del asistente: buscador de origen y destino, una fila de pastillas
 * con los días que tienen salidas (se ve un día a la vez) y la lista de ese
 * día, con "Salen pronto" arriba si es hoy (y hay otras más tarde) y las salidas llenas al final con
 * su lista de espera. Cada salida es una tarjeta entera que se toca para
 * elegirla. El precio es por persona; la tasa del terminal se avisa en una
 * línea bajo el título del día. En el teléfono las pastillas de días van en
 * una sola fila que se desliza de lado, para que la primera salida quepa en
 * la primera pantalla.
 */
export function StepDepartures({
  departures,
  origins,
  destinations,
  origin,
  destination,
  onChangeFilters,
  day,
  onChangeDay,
  now,
  selectedDepartureId,
  taxPerPassengerUsd,
  onSelect,
}: StepDeparturesProps) {
  // Clave de la lista que la persona pidió ver completa; cambiar de día o de búsqueda la recorta otra vez.
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const diasRef = useRef<HTMLDivElement>(null);

  const filtradas = useMemo(
    () =>
      departures.filter((d) => {
        if (origin && d.origin !== origin) return false;
        if (destination && d.destination !== destination) return false;
        return true;
      }),
    [departures, origin, destination],
  );

  const dias = useMemo(() => listDepartureDays(filtradas, now), [filtradas, now]);
  const diaActivo = pickDay(dias, day);
  const infoDia = dias.find((d) => d.key === diaActivo) ?? null;

  const { pronto, resto } = useMemo(
    () =>
      orderDayDepartures(
        filtradas.filter((d) => caracasDayKey(new Date(d.departsAtIso)) === diaActivo),
        now,
      ),
    [filtradas, diaActivo, now],
  );

  const ordenadas = [...pronto, ...resto];
  const claveLista = `${diaActivo}|${origin}|${destination}`;
  const indiceElegida = ordenadas.findIndex((d) => d.id === selectedDepartureId);
  const completa =
    expandedKey === claveLista || ordenadas.length <= DAY_INITIAL_LIMIT || indiceElegida >= DAY_INITIAL_LIMIT;
  const visibles = new Set((completa ? ordenadas : ordenadas.slice(0, DAY_INITIAL_LIMIT)).map((d) => d.id));
  const ocultas = ordenadas.length - visibles.size;

  const tasa = formatCents(parseCents(taxPerPassengerUsd) ?? BigInt(0), "USD");

  // En la fila deslizable, la pastilla del día elegido siempre queda a la vista
  // (por ejemplo, al volver del paso 2 con un día lejano). Solo se mueve la
  // fila, nunca la página.
  useEffect(() => {
    const fila = diasRef.current;
    const activa = fila?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!fila || !activa) return;
    const inicio = activa.offsetLeft;
    const fin = inicio + activa.offsetWidth;
    if (inicio < fila.scrollLeft || fin > fila.scrollLeft + fila.clientWidth) {
      fila.scrollLeft = Math.max(0, inicio - 16);
    }
  }, [diaActivo]);

  // Los títulos "Salen pronto" y "Más tarde" solo separan dos grupos: con uno
  // solo no aportan (el reloj y la hora en naranja ya marcan las urgentes) y
  // empujarían la primera salida fuera de la primera pantalla.
  const gruposVisibles = [
    { id: "pronto", titulo: "Salen pronto", lista: pronto.filter((d) => visibles.has(d.id)) },
    { id: "resto", titulo: "Más tarde", lista: resto.filter((d) => visibles.has(d.id)) },
  ].filter((grupo) => grupo.lista.length > 0);
  const conTitulos = gruposVisibles.length > 1;
  const grupos = gruposVisibles.map((grupo) => ({ ...grupo, titulo: conTitulos ? grupo.titulo : null }));

  return (
    <section className="flex flex-col gap-4">
      <SearchCard
        variant="marca"
        origins={origins}
        destinations={destinations}
        origin={origin}
        destination={destination}
        onChange={onChangeFilters}
      />

      {filtradas.length === 0 ? (
        <EmptyState
          icon={<IconBus />}
          title="No hay salidas con esa búsqueda"
          description="Prueba con otro origen u otro destino."
          action={
            <button
              type="button"
              onClick={() => onChangeFilters({ origin: "", destination: "" })}
              className={buttonClass("secundario")}
            >
              Ver todas las salidas
            </button>
          }
        />
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <p id="dias-titulo" className="font-semibold text-tinta">
              ¿Qué día sales?
            </p>
            <div
              ref={diasRef}
              role="group"
              aria-labelledby="dias-titulo"
              className="relative -mx-4 flex snap-x scroll-px-4 gap-2 overflow-x-auto px-4 py-1.5 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
            >
              {dias.map((d) => {
                const activo = d.key === diaActivo;
                return (
                  <button
                    key={d.key}
                    type="button"
                    aria-pressed={activo}
                    onClick={() => onChangeDay(d.key)}
                    className={cx(
                      "foco inline-flex min-h-14 shrink-0 cursor-pointer snap-start flex-col items-center justify-center rounded-pastilla border px-4 py-1 leading-tight transition-colors duration-150 ease-out motion-reduce:transition-none",
                      activo
                        ? "border-marca-600 bg-marca-600 text-white"
                        : "border-borde-control bg-superficie text-tinta hover:border-marca-600 hover:bg-marca-50",
                    )}
                  >
                    <span className={cx("whitespace-nowrap text-base", activo ? "font-bold" : "font-semibold")}>
                      {d.label}
                    </span>
                    <span
                      className={cx(
                        "tabular whitespace-nowrap text-sm",
                        activo ? "text-white" : "text-tinta-suave",
                      )}
                    >
                      {d.count === 1 ? "1 salida" : `${d.count} salidas`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {infoDia ? (
            <section aria-labelledby="dia-elegido" className="flex flex-col gap-3">
              <div className="flex flex-col gap-0.5">
                <h3 id="dia-elegido" className="text-lg font-semibold text-tinta">
                  {infoDia.heading}
                </h3>
                <p className="text-sm text-tinta-suave">
                  Precio por persona + tasa del terminal de <span className="tabular whitespace-nowrap">{tasa}</span>
                </p>
              </div>
              {grupos.map((grupo) => (
                <div key={grupo.id} className="flex flex-col gap-3">
                  {grupo.titulo ? (
                    <h4 className="text-base font-semibold text-tinta-suave">{grupo.titulo}</h4>
                  ) : null}
                  <ul className="flex flex-col gap-3">
                    {grupo.lista.map((d) => (
                      <li key={d.id}>
                        <DepartureOption
                          departure={d}
                          now={now}
                          selected={d.id === selectedDepartureId}
                          onSelect={() => onSelect(d.id)}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              {ocultas > 0 ? (
                <button
                  type="button"
                  onClick={() => setExpandedKey(claveLista)}
                  className={buttonClass("secundario", "w-full")}
                >
                  {ocultas === 1 ? "Ver 1 salida más de este día" : `Ver ${ocultas} salidas más de este día`}
                </button>
              ) : null}
            </section>
          ) : null}
        </>
      )}
    </section>
  );
}

/**
 * Una salida como tarjeta que se toca entera para elegirla: destino, origen
 * y, en su propia línea, la agencia a la izquierda, precio y puestos a la derecha, y abajo la hora
 * (el día ya lo dice el título de la lista) con la acción visible: "Elegir"
 * o, si no quedan puestos, "Lista de espera".
 */
function DepartureOption({
  departure: d,
  now,
  selected,
  onSelect,
}: {
  departure: DepartureVM;
  now: Date;
  selected: boolean;
  onSelect: () => void;
}) {
  const departsAt = new Date(d.departsAtIso);
  const urgente = minutesUntil(departsAt, now) < URGENT_DEPARTURE_MINUTES;
  const nivel = seatsLevel(d.available);
  const llena = d.available <= 0;
  const agencia = d.agencyName.trim();

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cx(
        "foco block w-full cursor-pointer rounded-tarjeta border bg-superficie p-4 text-left shadow-1 transition-colors duration-150 ease-out hover:border-marca-600 hover:bg-marca-50/60 motion-reduce:transition-none",
        selected ? "border-marca-600 ring-1 ring-marca-600" : "border-borde",
      )}
    >
      <span className="flex items-start justify-between gap-3">
        <span className="min-w-0 flex-1">
          <span className="block break-words text-lg font-bold leading-snug text-tinta">
            <span className="sr-only">Hacia </span>
            {d.destination}
          </span>
          <span className="block break-words text-sm text-tinta-suave">Desde {d.origin}</span>
          {agencia ? (
            <span className="mt-0.5 flex items-center gap-1.5 text-sm text-tinta-suave">
              <span
                aria-hidden="true"
                className="inline-block size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: agencyColor(d.agencyId).bg }}
              />
              <span className="min-w-0 break-words">{agencia}</span>
            </span>
          ) : null}
        </span>
        <span className="shrink-0 text-right">
          <span className="tabular block text-lg font-bold leading-snug text-tinta">
            {formatFareUsd(d.fareUsd)}
            <span className="sr-only"> por persona</span>
          </span>
          <span className={cx("tabular block text-sm", SEATS_TONE_CLASSES[nivel])}>{seatsLabel(d.available)}</span>
        </span>
      </span>

      {/* "Elegir" queda siempre en la esquina de abajo a la derecha: si la hora y la duración no caben, la duración baja dentro de su columna. */}
      <span className="mt-2 flex items-end justify-between gap-3">
        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
          <span
            className={cx(
              "tabular flex items-center gap-1.5 text-base",
              urgente ? "font-bold text-alerta" : "font-semibold text-tinta",
            )}
          >
            {urgente ? <IconClock aria-hidden="true" className="size-5 shrink-0" /> : null}
            {departureWhenLabel(departsAt, now, { dayInHeading: true })}
          </span>
          <span className="tabular text-sm text-tinta-suave">{tripDurationLabel(d.estimatedMinutes)}</span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-marca-700">
          {selected ? <span className="sr-only">Elegida. </span> : null}
          {llena ? "Lista de espera" : "Elegir"}
          <IconChevronRight aria-hidden="true" className="size-5 shrink-0" />
        </span>
      </span>
    </button>
  );
}
