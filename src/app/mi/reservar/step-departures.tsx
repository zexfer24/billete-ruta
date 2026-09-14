"use client";

import { useMemo, useState } from "react";
import { SearchCard } from "@/components/search-card";
import { DepartureRow } from "@/components/departure-row";
import { Card, SectionTitle, buttonClass } from "@/components/ui";
import { formatCaracasDate, minutesUntil } from "@/lib/time";
import { toDepartureRowData, type DepartureVM } from "./booking-form";

type FiltroTiempo = "ahora" | "hoy" | "todas";

const PASTILLAS_TIEMPO: readonly [FiltroTiempo, string][] = [
  ["ahora", "Salir ahora"],
  ["hoy", "Hoy"],
  ["todas", "Todas"],
];

interface StepDeparturesProps {
  departures: DepartureVM[];
  origins: string[];
  destinations: string[];
  origin: string;
  destination: string;
  onChangeFilters: (next: { origin: string; destination: string }) => void;
  now: Date;
  onSelect: (id: string) => void;
}

/** Paso 1 del asistente: buscador de origen y destino, filtros rápidos de tiempo y la lista de salidas en línea de tiempo. */
export function StepDepartures({
  departures,
  origins,
  destinations,
  origin,
  destination,
  onChangeFilters,
  now,
  onSelect,
}: StepDeparturesProps) {
  const [filtroTiempo, setFiltroTiempo] = useState<FiltroTiempo>("todas");

  const filtradas = useMemo(() => {
    return departures.filter((d) => {
      if (origin && d.origin !== origin) return false;
      if (destination && d.destination !== destination) return false;
      const departsAt = new Date(d.departsAtIso);
      if (filtroTiempo === "ahora") return departsAt.getTime() <= now.getTime() + 3 * 3_600_000;
      if (filtroTiempo === "hoy") return formatCaracasDate(departsAt) === formatCaracasDate(now);
      return true;
    });
  }, [departures, origin, destination, filtroTiempo, now]);

  const proximas = filtradas.filter((d) => minutesUntil(new Date(d.departsAtIso), now) < 60);
  const hoyMismo = filtradas.filter((d) => {
    const departsAt = new Date(d.departsAtIso);
    return minutesUntil(departsAt, now) >= 60 && formatCaracasDate(departsAt) === formatCaracasDate(now);
  });
  const otrosDias = filtradas.filter(
    (d) => formatCaracasDate(new Date(d.departsAtIso)) !== formatCaracasDate(now),
  );

  function verTodas() {
    setFiltroTiempo("todas");
    onChangeFilters({ origin: "", destination: "" });
  }

  function accion(d: DepartureVM) {
    return d.available === 0 ? (
      <button type="button" onClick={() => onSelect(d.id)} className={buttonClass("secundario")}>
        Lista de espera
      </button>
    ) : (
      <button type="button" onClick={() => onSelect(d.id)} className={buttonClass("primario")}>
        Elegir
      </button>
    );
  }

  return (
    <section className="flex flex-col gap-4">
      <SearchCard
        variant="verde"
        origins={origins}
        destinations={destinations}
        origin={origin}
        destination={destination}
        onChange={onChangeFilters}
      >
        {PASTILLAS_TIEMPO.map(([valor, etiqueta]) => (
          <button
            key={valor}
            type="button"
            aria-pressed={filtroTiempo === valor}
            onClick={() => setFiltroTiempo(valor)}
            className={`inline-flex min-h-11 items-center rounded-pastilla px-4 font-semibold text-tinta transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 motion-reduce:transition-none ${
              filtroTiempo === valor ? "bg-white ring-2 ring-white" : "bg-white/90"
            }`}
          >
            {etiqueta}
          </button>
        ))}
      </SearchCard>

      {filtradas.length === 0 ? (
        <Card className="flex flex-col items-start gap-3">
          <p className="text-tinta-suave">No hay salidas con ese filtro.</p>
          <button type="button" onClick={verTodas} className={buttonClass("fantasma")}>
            Ver todas
          </button>
        </Card>
      ) : (
        <>
          {proximas.length > 0 ? (
            <div className="flex flex-col gap-3">
              <SectionTitle>Próximas</SectionTitle>
              {proximas.map((d) => (
                <DepartureRow key={d.id} departure={toDepartureRowData(d)} now={now} action={accion(d)} />
              ))}
            </div>
          ) : null}
          {hoyMismo.length > 0 ? (
            <div className="flex flex-col gap-3">
              <SectionTitle>Hoy</SectionTitle>
              {hoyMismo.map((d) => (
                <DepartureRow key={d.id} departure={toDepartureRowData(d)} now={now} action={accion(d)} />
              ))}
            </div>
          ) : null}
          {otrosDias.length > 0 ? (
            <div className="flex flex-col gap-3">
              <SectionTitle>Otros días</SectionTitle>
              {otrosDias.map((d) => (
                <DepartureRow key={d.id} departure={toDepartureRowData(d)} now={now} action={accion(d)} />
              ))}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
