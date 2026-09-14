"use client";

import type { ReactNode } from "react";
import { IconDot, IconNavigation, IconSwap } from "./icons";

export interface SearchCardProps {
  origins: string[];
  destinations: string[];
  origin: string;
  destination: string;
  onChange: (next: { origin: string; destination: string }) => void;
  variant: "azul" | "verde";
  children?: ReactNode;
}

/**
 * Tarjeta de búsqueda de origen y destino, con raíl de icono de ubicación y
 * botón de intercambio, al estilo de Transit. Variante `verde` para la
 * pantalla de reservar, `azul` para la portada.
 */
export function SearchCard({
  origins,
  destinations,
  origin,
  destination,
  onChange,
  variant,
  children,
}: SearchCardProps) {
  const esVerde = variant === "verde";

  return (
    <div className={`rounded-tarjeta p-4 ${esVerde ? "bg-ruta" : "bg-white"}`}>
      {!esVerde ? <p className="mb-3 font-bold text-tinta">¿Adónde vamos?</p> : null}
      <div className="flex items-stretch gap-3">
        <div className={`flex flex-col items-center gap-1 py-2 ${esVerde ? "text-white" : "text-marca"}`}>
          <IconNavigation aria-hidden="true" width={18} height={18} />
          <span className={`w-px flex-1 ${esVerde ? "bg-white/50" : "bg-marca/30"}`} aria-hidden="true" />
          <IconDot aria-hidden="true" width={18} height={18} />
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <label
            className={`flex min-h-12 flex-col justify-center gap-0.5 rounded-xl px-3 py-1.5 ${
              esVerde ? "bg-ruta-oscura text-white" : "bg-lienzo text-tinta"
            }`}
          >
            <span className="text-xs font-medium opacity-80">Origen</span>
            <select
              value={origin}
              onChange={(evento) => onChange({ origin: evento.target.value, destination })}
              className="min-h-6 bg-transparent text-base font-semibold focus-visible:outline-none"
            >
              <option value="">Todos</option>
              {origins.map((valor) => (
                <option key={valor} value={valor} className="text-tinta">
                  {valor}
                </option>
              ))}
            </select>
          </label>
          <label
            className={`flex min-h-12 flex-col justify-center gap-0.5 rounded-xl px-3 py-1.5 ${
              esVerde ? "bg-ruta-oscura text-white" : "bg-lienzo text-tinta"
            }`}
          >
            <span className="text-xs font-medium opacity-80">Destino</span>
            <select
              value={destination}
              onChange={(evento) => onChange({ origin, destination: evento.target.value })}
              className="min-h-6 bg-transparent text-base font-semibold focus-visible:outline-none"
            >
              <option value="">Todos</option>
              {destinations.map((valor) => (
                <option key={valor} value={valor} className="text-tinta">
                  {valor}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button
          type="button"
          aria-label="Intercambiar origen y destino"
          onClick={() => onChange({ origin: destination, destination: origin })}
          className={[
            "flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center self-center rounded-pastilla transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 motion-reduce:transition-none",
            esVerde
              ? "bg-ruta-oscura text-white hover:brightness-90 focus-visible:ring-white"
              : "bg-lienzo text-marca hover:bg-marca-clara focus-visible:ring-marca",
          ].join(" ")}
        >
          <IconSwap aria-hidden="true" />
        </button>
      </div>
      {children ? <div className="mt-3 flex flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  );
}
