"use client";

import { useMemo, useState } from "react";
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
 * día, con "Salen pronto" arriba si es hoy y las salidas llenas al final con
 * su lista de espera. Cada salida es una tarjeta entera que se toca para
 * elegirla. El precio es por persona; la tasa del terminal se avisa arriba.
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

  const grupos = [
    { id: "pronto", titulo: "Salen pronto", lista: pronto.filter((d) => visibles.has(d.id)) },
    { id: "resto", titulo: pronto.length > 0 ? "Más tarde" : null, lista: resto.filter((d) => visibles.has(d.id)) },
  ].filter((grupo) => grupo.lista.length > 0);

  return (
    <section className="flex flex-col gap-5">
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
            <div role="group" aria-labelledby="dias-titulo" className="flex flex-wrap gap-2">
              {dias.map((d) => {
                const activo = d.key === diaActivo;
                return (
                  <button
                    key={d.key}
                    type="button"
                    aria-pressed={activo}
                    onClick={() => onChangeDay(d.key)}
                    className={cx(
                      "foco inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-pastilla border px-4 text-base transition-colors duration-150 ease-out motion-reduce:transition-none",
                      activo
                        ? "border-marca-600 bg-marca-600 font-semibold text-white"
                        : "border-borde-control bg-superficie font-medium text-tinta hover:border-marca-600 hover:bg-marca-50",
                    )}
                  >
                    {d.label}
                    <span
                      className={cx(
                        "tabular rounded-pastilla px-2 text-sm font-semibold",
                        activo ? "bg-white/20 text-white" : "bg-marca-50 text-marca-700",
                      )}
                    >
                      {d.count}
                      <span className="sr-only">{d.count === 1 ? " salida" : " salidas"}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            {!destination ? (
              <p className="text-sm leading-relaxed text-tinta-suave">
                Elige arriba a dónde vas para ver menos opciones.
              </p>
            ) : null}
            <p className="text-sm leading-relaxed text-tinta-suave">
              Los precios son por persona. A cada pasajero se le suma la tasa del terminal de{" "}
              <span className="tabular whitespace-nowrap">{tasa}</span>.
            </p>
          </div>

          {infoDia ? (
            <section aria-labelledby="dia-elegido" className="flex flex-col gap-4">
              <h3 id="dia-elegido" className="text-lg font-semibold text-tinta">
                {infoDia.heading}
              </h3>
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
 * y agencia a la izquierda, precio y puestos a la derecha, y abajo la hora
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
          <span className="block break-words text-sm text-tinta-suave">
            Desde {d.origin}
            {agencia ? (
              <>
                {" · "}
                <span
                  aria-hidden="true"
                  className="mr-1 inline-block size-2.5 rounded-full align-middle"
                  style={{ backgroundColor: agencyColor(d.agencyId).bg }}
                />
                {agencia}
              </>
            ) : null}
          </span>
        </span>
        <span className="shrink-0 text-right">
          <span className="tabular block text-lg font-bold leading-snug text-tinta">
            {formatFareUsd(d.fareUsd)}
            <span className="sr-only"> por persona</span>
          </span>
          <span className={cx("tabular block text-sm", SEATS_TONE_CLASSES[nivel])}>{seatsLabel(d.available)}</span>
        </span>
      </span>

      <span className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
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
        <span className="ml-auto inline-flex items-center gap-1 font-semibold text-marca-700">
          {selected ? <span className="sr-only">Elegida. </span> : null}
          {llena ? "Lista de espera" : "Elegir"}
          <IconChevronRight aria-hidden="true" className="size-5 shrink-0" />
        </span>
      </span>
    </button>
  );
}
