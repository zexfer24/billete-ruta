"use client";

import { useMemo, useState } from "react";
import { SearchCard } from "@/components/search-card";
import { DepartureRow } from "@/components/departure-row";
import { EmptyState } from "@/components/ui";
import { buttonClass, cx } from "@/components/ui-classes";
import { IconBus } from "@/components/icons";
import { formatCaracasDate, minutesUntil } from "@/lib/time";
import { formatCents, parseCents } from "./money";
import { toDepartureRowData, type DepartureVM } from "./booking-form";

type FiltroTiempo = "todas" | "hoy" | "pronto";

const FILTROS_TIEMPO: readonly [FiltroTiempo, string][] = [
  ["todas", "Todas"],
  ["hoy", "Hoy"],
  ["pronto", "Próximas 3 horas"],
];

const TRES_HORAS_MS = 3 * 3_600_000;

interface StepDeparturesProps {
  departures: DepartureVM[];
  origins: string[];
  destinations: string[];
  origin: string;
  destination: string;
  onChangeFilters: (next: { origin: string; destination: string }) => void;
  now: Date;
  selectedDepartureId: string | null;
  taxPerPassengerUsd: string;
  onSelect: (id: string) => void;
}

/**
 * Paso 1 del asistente: buscador de origen y destino, filtro de cuándo sale
 * y la lista de salidas agrupada en "Salen pronto", "Hoy" y "Otros días".
 * Cada salida tiene su botón "Elegir" (o "Lista de espera" si no quedan
 * puestos). El precio es por persona; la tasa del terminal se avisa arriba.
 */
export function StepDepartures({
  departures,
  origins,
  destinations,
  origin,
  destination,
  onChangeFilters,
  now,
  selectedDepartureId,
  taxPerPassengerUsd,
  onSelect,
}: StepDeparturesProps) {
  const [filtroTiempo, setFiltroTiempo] = useState<FiltroTiempo>("todas");
  const hoy = formatCaracasDate(now);

  const filtradas = useMemo(() => {
    return departures.filter((d) => {
      if (origin && d.origin !== origin) return false;
      if (destination && d.destination !== destination) return false;
      const departsAt = new Date(d.departsAtIso);
      if (filtroTiempo === "pronto") return departsAt.getTime() <= now.getTime() + TRES_HORAS_MS;
      if (filtroTiempo === "hoy") return formatCaracasDate(departsAt) === hoy;
      return true;
    });
  }, [departures, origin, destination, filtroTiempo, now, hoy]);

  const pronto = filtradas.filter((d) => minutesUntil(new Date(d.departsAtIso), now) < 60);
  const hoyMismo = filtradas.filter((d) => {
    const departsAt = new Date(d.departsAtIso);
    return minutesUntil(departsAt, now) >= 60 && formatCaracasDate(departsAt) === hoy;
  });
  const otrosDias = filtradas.filter((d) => formatCaracasDate(new Date(d.departsAtIso)) !== hoy);

  const tasa = formatCents(parseCents(taxPerPassengerUsd) ?? BigInt(0), "USD");

  function verTodas() {
    setFiltroTiempo("todas");
    onChangeFilters({ origin: "", destination: "" });
  }

  function accion(d: DepartureVM) {
    const contexto = `${d.origin} a ${d.destination}, ${d.departsAtLabel}`;
    return d.available === 0 ? (
      <button
        type="button"
        onClick={() => onSelect(d.id)}
        aria-label={`Lista de espera: ${contexto}`}
        className={buttonClass("fantasma", undefined, "sm")}
      >
        Lista de espera
      </button>
    ) : (
      <button
        type="button"
        onClick={() => onSelect(d.id)}
        aria-label={`Elegir: ${contexto}`}
        className={buttonClass("secundario", "px-6", "sm")}
      >
        Elegir
      </button>
    );
  }

  const grupos = [
    { id: "pronto", titulo: "Salen pronto", lista: pronto },
    { id: "hoy", titulo: "Hoy", lista: hoyMismo },
    { id: "otros", titulo: "Otros días", lista: otrosDias },
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

      <div role="group" aria-label="Cuándo quieres salir" className="flex flex-wrap gap-2">
        {FILTROS_TIEMPO.map(([valor, etiqueta]) => {
          const activo = filtroTiempo === valor;
          return (
            <button
              key={valor}
              type="button"
              aria-pressed={activo}
              onClick={() => setFiltroTiempo(valor)}
              className={cx(
                "foco inline-flex min-h-11 cursor-pointer items-center rounded-pastilla border px-4 text-base transition-colors duration-150 ease-out motion-reduce:transition-none",
                activo
                  ? "border-marca-600 bg-marca-600 font-semibold text-white"
                  : "border-borde-control bg-superficie font-medium text-tinta hover:border-marca-600 hover:bg-marca-50",
              )}
            >
              {etiqueta}
            </button>
          );
        })}
      </div>

      <p className="text-sm leading-relaxed text-tinta-suave">
        Los precios son por persona. A cada pasajero se le suma la tasa del terminal de {tasa}.
      </p>

      {filtradas.length === 0 ? (
        <EmptyState
          icon={<IconBus />}
          title="No hay salidas con esa búsqueda"
          description="Prueba con otro origen, otro destino u otro día."
          action={
            <button type="button" onClick={verTodas} className={buttonClass("secundario")}>
              Ver todas las salidas
            </button>
          }
        />
      ) : (
        grupos.map((grupo) => (
          <section key={grupo.id} aria-labelledby={`grupo-${grupo.id}`} className="flex flex-col gap-3">
            <h3 id={`grupo-${grupo.id}`} className="text-lg font-semibold text-tinta">
              {grupo.titulo}
            </h3>
            <ul className="flex flex-col gap-3">
              {grupo.lista.map((d) => (
                <li key={d.id}>
                  <DepartureRow
                    departure={toDepartureRowData(d)}
                    now={now}
                    selected={d.id === selectedDepartureId}
                    action={accion(d)}
                  />
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </section>
  );
}
