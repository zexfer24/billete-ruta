"use client";

import { useState } from "react";
import { formatCaracas } from "@/lib/time";
import { formatUsdString } from "@/lib/decimal";
import { Pill } from "@/components/ui";
import { panelButtonClass } from "@/components/panel-ui";
import { cx } from "@/components/ui-classes";
import { IconCheckCircle, IconSearch } from "@/components/icons";
import { countLabel } from "../_dashboard/text";
import type { DepartureOption } from "./counter-sale-form";
import { CounterField } from "./counter-field";
import { DAY_CHIP_BASE_CLASS, DAY_CHIP_IDLE_CLASS, DEPARTURE_SEARCH_INPUT_CLASS } from "./classes";
import { dayKey, groupByDay, normalizeSearch, routeNameAddsInfo } from "./departure-days";

/** Con más salidas que estas, aparecen las fichas de día y el buscador por origen o destino. */
const SEARCH_THRESHOLD = 6;

/** `id` de la lista de salidas, para llevarla a la vista desde «Continuar». */
export const DEPARTURE_LIST_ID = "taquilla-salidas";

/** `id` del buscador de salidas, el destino de «Continuar» si la búsqueda no deja ninguna. */
export const DEPARTURE_SEARCH_ID = "taquilla-buscar-salida";

/** Por debajo de estos puestos libres, la pastilla avisa en ámbar. */
const FEW_SEATS = 5;

/** Tarjeta de una salida: radio, hora grande, ruta, puestos y precio final por persona. */
function DepartureCard({
  departure: d,
  selected,
  onSelect,
}: {
  departure: DepartureOption;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const pocos = d.available < FEW_SEATS;
  return (
    <label
      className={`flex cursor-pointer items-center gap-3 rounded-tarjeta border-2 bg-superficie px-4 py-4 transition-colors duration-150 ease-out motion-reduce:transition-none sm:gap-4 ${
        selected ? "border-marca-600 bg-marca-50" : "border-borde hover:border-marca-600/60"
      }`}
    >
      <input
        type="radio"
        name="departureId"
        value={d.id}
        checked={selected}
        onChange={() => onSelect(d.id)}
        className="foco size-5 shrink-0 accent-marca-600"
      />
      <span className="tabular w-14 shrink-0 text-xl font-bold text-tinta sm:w-16 sm:text-2xl">
        {formatCaracas(new Date(d.departsAtIso), "HH:mm")}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-base font-semibold text-tinta">
          {d.origin} → {d.destination}
        </span>
        {routeNameAddsInfo(d) ? <span className="text-sm text-tinta-suave">{d.routeName}</span> : null}
        <span className="flex flex-wrap items-center gap-2">
          <Pill tone={pocos ? "alerta" : "neutro"}>
            {pocos
              ? `Quedan ${countLabel(d.available, "puesto", "puestos")}`
              : countLabel(d.available, "puesto libre", "puestos libres")}
          </Pill>
          {d.price ? (
            <span className="tabular text-sm font-semibold text-tinta">
              {formatUsdString(d.price.totalUsd)} por persona
            </span>
          ) : (
            <span className="tabular text-sm font-semibold text-tinta">
              Pasaje: {formatUsdString(d.fareUsd)} por persona
            </span>
          )}
        </span>
        {/* El total es lo que se le dice al pasajero en voz alta; la tasa va
            aparte para que nadie tenga que sumar de cabeza. */}
        {d.price ? (
          <span className="tabular text-sm text-tinta-suave">
            Incluye la tasa del terminal de {formatUsdString(d.price.taxUsd)}
          </span>
        ) : null}
      </span>
      {selected ? <IconCheckCircle className="size-6 shrink-0 text-marca-600" /> : null}
    </label>
  );
}

/**
 * Paso 1 del asistente: elige la salida. Con pocas salidas se ven todas,
 * agrupadas por día. Con muchas, unas fichas de día arriba muestran un día a
 * la vez (su título dice cuántas salidas tiene), empezando por el primero
 * que tiene salidas; el buscador por origen o destino busca en los 7 días.
 * Cada tarjeta lleva la hora grande, la ruta, los puestos libres y el precio.
 */
export function StepDeparture({
  departures,
  selectedId,
  onSelect,
  nowIso,
  active,
}: {
  departures: DepartureOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Hora del servidor al pintar la página, para que "Hoy" y "Mañana" no dependan del reloj del equipo. */
  nowIso: string;
  /** Si el paso está a la vista: al volver a él se abre el día de la salida elegida. */
  active: boolean;
}) {
  const [busqueda, setBusqueda] = useState("");
  const now = new Date(nowIso);
  const todos = groupByDay(departures, now);
  const conFichas = departures.length > SEARCH_THRESHOLD && todos.length > 1;
  const [dia, setDia] = useState<string>(todos[0]?.key ?? "");

  // Al volver desde otro paso, si la salida elegida es de otro día, se abre
  // ese día para que su tarjeta marcada quede a la vista.
  const [prevActive, setPrevActive] = useState(active);
  if (prevActive !== active) {
    setPrevActive(active);
    const elegida = active ? departures.find((d) => d.id === selectedId) : undefined;
    if (elegida) setDia(dayKey(new Date(elegida.departsAtIso)));
  }

  const termino = normalizeSearch(busqueda.trim());
  const grupos = termino
    ? groupByDay(
        departures.filter((d) => normalizeSearch(`${d.origin} ${d.destination} ${d.routeName}`).includes(termino)),
        now,
      )
    : conFichas
      ? todos.filter((grupo) => grupo.key === dia)
      : todos;

  return (
    <div className="flex flex-col gap-5">
      {departures.length > SEARCH_THRESHOLD ? (
        <CounterField
          id={DEPARTURE_SEARCH_ID}
          type="search"
          label="Buscar por origen o destino"
          hint={`${countLabel(departures.length, "salida", "salidas")} con puestos en los próximos 7 días.`}
          autoComplete="off"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          inputClassName={DEPARTURE_SEARCH_INPUT_CLASS}
        />
      ) : null}

      {conFichas && !termino ? (
        // Las fichas bajan de fila en vez de desplazarse de lado: así se ven
        // todos los días sin adivinar que la tira se desliza. Llevan solo el
        // día: cuántas salidas tiene lo dice el título de la lista, en
        // palabras, en vez de un número suelto en cada ficha. `relative` en el
        // grupo y en cada ficha contiene el texto `sr-only` (posición
        // absoluta), que de otro modo ensanchaba la página en el teléfono y
        // dejaba la barra de «Continuar» fuera de la pantalla.
        <div role="group" aria-label="Día de la salida" className="relative">
          <div className="flex flex-wrap gap-2">
            {todos.map((grupo) => {
              const elegido = grupo.key === dia;
              return (
                <button
                  key={grupo.key}
                  type="button"
                  aria-pressed={elegido}
                  onClick={() => setDia(grupo.key)}
                  className={cx(
                    "foco transition-colors duration-150 ease-out motion-reduce:transition-none",
                    DAY_CHIP_BASE_CLASS,
                    elegido ? "border-marca-600 bg-marca-600 text-white" : `${DAY_CHIP_IDLE_CLASS} hover:bg-marca-50`,
                  )}
                >
                  {grupo.chipLabel}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {grupos.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-tarjeta border border-dashed border-borde bg-superficie p-5">
          <p className="flex items-center gap-2 text-base font-semibold text-tinta">
            <IconSearch className="size-5 text-marca-600" />
            Ninguna salida de los próximos 7 días coincide con «{busqueda.trim()}»
          </p>
          <button type="button" onClick={() => setBusqueda("")} className={panelButtonClass("secundario")}>
            Borrar la búsqueda
          </button>
        </div>
      ) : (
        // `id` y `scroll-mt`: «Continuar» sin elegir trae la lista a la vista
        // por debajo de la barra superior del teléfono (ver `counter-sale-form`).
        <fieldset id={DEPARTURE_LIST_ID} className="flex scroll-mt-20 flex-col gap-6 lg:scroll-mt-4">
          <legend className="sr-only">Salidas con puestos libres</legend>
          {grupos.map((grupo) => (
            <div key={grupo.key} className="flex flex-col gap-3">
              <p className="text-sm font-bold text-tinta-suave">
                {grupo.label} · {countLabel(grupo.items.length, "salida", "salidas")}
              </p>
              {grupo.items.map((d) => (
                <DepartureCard key={d.id} departure={d} selected={d.id === selectedId} onSelect={onSelect} />
              ))}
            </div>
          ))}
        </fieldset>
      )}
    </div>
  );
}
