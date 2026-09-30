"use client";

import { useState } from "react";
import { formatCaracas } from "@/lib/time";
import { formatUsdString } from "@/lib/decimal";
import { Pill } from "@/components/ui";
import { panelButtonClass } from "@/components/panel-ui";
import { IconCheckCircle, IconSearch } from "@/components/icons";
import { countLabel } from "../_dashboard/text";
import type { DepartureOption } from "./counter-sale-form";
import { CounterField } from "./counter-field";

/** Con más salidas que estas, aparece el buscador por origen o destino. */
const SEARCH_THRESHOLD = 6;

/** Por debajo de estos puestos libres, la pastilla avisa en ámbar. */
const FEW_SEATS = 5;

const DAY_FORMAT = new Intl.DateTimeFormat("es-VE", {
  timeZone: "America/Caracas",
  weekday: "long",
  day: "numeric",
  month: "long",
});

/** Texto sin acentos y en minúsculas, para buscar "merida" y encontrar "Mérida". */
function normalize(value: string): string {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

/** "Hoy, martes 30 de septiembre", "Mañana, miércoles 1 de octubre" o solo la fecha. */
function dayLabel(date: Date, now: Date): string {
  const dia = formatCaracas(date, "yyyy-MM-dd");
  const texto = DAY_FORMAT.format(date).replace(",", "");
  if (dia === formatCaracas(now, "yyyy-MM-dd")) return `Hoy, ${texto}`;
  if (dia === formatCaracas(new Date(now.getTime() + 86_400_000), "yyyy-MM-dd")) return `Mañana, ${texto}`;
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Salidas agrupadas por día de Caracas, en el orden en que llegan (ya vienen por hora). */
function groupByDay(departures: DepartureOption[], now: Date) {
  const grupos: Array<{ key: string; label: string; items: DepartureOption[] }> = [];
  for (const d of departures) {
    const fecha = new Date(d.departsAtIso);
    const key = formatCaracas(fecha, "yyyy-MM-dd");
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.key === key) {
      ultimo.items.push(d);
    } else {
      grupos.push({ key, label: dayLabel(fecha, now), items: [d] });
    }
  }
  return grupos;
}

/**
 * Paso 1 del asistente: elige la salida. Las salidas van agrupadas por día,
 * con la hora grande, el destino, los puestos libres y el precio por persona.
 * Con muchas salidas aparece un buscador por origen o destino.
 */
export function StepDeparture({
  departures,
  selectedId,
  onSelect,
  nowIso,
}: {
  departures: DepartureOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Hora del servidor al pintar la página, para que "Hoy" y "Mañana" no dependan del reloj del equipo. */
  nowIso: string;
}) {
  const [busqueda, setBusqueda] = useState("");
  const now = new Date(nowIso);
  const termino = normalize(busqueda.trim());
  const visibles = termino
    ? departures.filter((d) =>
        normalize(`${d.origin} ${d.destination} ${d.routeName}`).includes(termino),
      )
    : departures;
  const grupos = groupByDay(visibles, now);

  return (
    <div className="flex flex-col gap-5">
      {departures.length > SEARCH_THRESHOLD ? (
        <CounterField
          id="taquilla-buscar-salida"
          type="search"
          label="Buscar por origen o destino"
          hint={`Hay ${countLabel(departures.length, "salida", "salidas")} con puestos en los próximos 7 días.`}
          autoComplete="off"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          inputClassName="max-w-md"
        />
      ) : null}

      {grupos.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-tarjeta border border-dashed border-borde bg-superficie p-5">
          <p className="flex items-center gap-2 text-base font-semibold text-tinta">
            <IconSearch className="size-5 text-marca-600" />
            Ninguna salida coincide con «{busqueda.trim()}»
          </p>
          <button type="button" onClick={() => setBusqueda("")} className={panelButtonClass("secundario")}>
            Borrar la búsqueda
          </button>
        </div>
      ) : (
        <fieldset className="flex flex-col gap-6">
          <legend className="sr-only">Salidas con puestos libres</legend>
          {grupos.map((grupo) => (
            <div key={grupo.key} className="flex flex-col gap-3">
              <p className="text-sm font-bold text-tinta-suave">{grupo.label}</p>
              {grupo.items.map((d) => {
                const selected = d.id === selectedId;
                const pocos = d.available < FEW_SEATS;
                return (
                  <label
                    key={d.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-tarjeta border-2 bg-superficie px-4 py-4 sm:gap-4 transition-colors duration-150 ease-out motion-reduce:transition-none ${
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
                      <span className="text-sm text-tinta-suave">{d.routeName}</span>
                      <span className="flex flex-wrap items-center gap-2">
                        <Pill tone={pocos ? "alerta" : "neutro"}>
                          {pocos
                            ? `Quedan ${countLabel(d.available, "puesto", "puestos")}`
                            : countLabel(d.available, "puesto libre", "puestos libres")}
                        </Pill>
                        <span className="tabular text-sm font-semibold text-tinta">
                          Pasaje: {formatUsdString(d.fareUsd)} por persona
                        </span>
                      </span>
                    </span>
                    {selected ? <IconCheckCircle className="size-6 shrink-0 text-marca-600" /> : null}
                  </label>
                );
              })}
            </div>
          ))}
        </fieldset>
      )}
    </div>
  );
}
