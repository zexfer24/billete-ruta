"use client";

import { useId, type ReactNode } from "react";
import { IconChevronDown, IconSwap } from "./icons";

export interface SearchCardProps {
  origins: string[];
  destinations: string[];
  origin: string;
  destination: string;
  onChange: (next: { origin: string; destination: string }) => void;
  /**
   * `marca` es la única apariencia: tarjeta morada con campos blancos, para
   * que la acción principal (botón `acento`, amarillo) quede sobre morado.
   * `verde` se conserva como alias obsoleto de `marca` para quien todavía lo
   * pase (el asistente de reserva); no lo uses en código nuevo.
   */
  variant?: "marca" | "verde";
  /** Título visible de la tarjeta, como `h2` (por ejemplo "¿A dónde viajas?"). */
  title?: ReactNode;
  /** Botones y avisos debajo de los campos. */
  children?: ReactNode;
}

/**
 * Buscador de origen y destino: dos listas grandes con su etiqueta visible
 * siempre ("¿De dónde sales?", "¿A dónde vas?"), que arrancan en "Cualquier
 * origen" y "Cualquier destino", y un botón con texto para invertirlas. Las
 * acciones van en `children`, sobre el fondo morado.
 */
export function SearchCard({
  origins,
  destinations,
  origin,
  destination,
  onChange,
  title,
  children,
}: SearchCardProps) {
  const baseId = useId();

  return (
    <div className="rounded-tarjeta bg-marca-700 p-4 text-white sm:p-5">
      {title ? <h2 className="mb-3 text-lg font-semibold text-white">{title}</h2> : null}
      <div className="flex items-center gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <PlaceSelect
            id={`${baseId}-origen`}
            label="¿De dónde sales?"
            placeholder="Cualquier origen"
            value={origin}
            options={origins}
            onChange={(valor) => onChange({ origin: valor, destination })}
          />
          <PlaceSelect
            id={`${baseId}-destino`}
            label="¿A dónde vas?"
            placeholder="Cualquier destino"
            value={destination}
            options={destinations}
            onChange={(valor) => onChange({ origin, destination: valor })}
          />
        </div>
        <button
          type="button"
          onClick={() => onChange({ origin: destination, destination: origin })}
          className="foco-sobre-marca flex min-h-14 w-16 shrink-0 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-control bg-white/10 px-1 text-sm font-semibold text-white transition-colors duration-150 ease-out hover:bg-white/20 motion-reduce:transition-none"
        >
          <IconSwap aria-hidden="true" className="size-5" />
          Invertir
          <span className="sr-only"> origen y destino</span>
        </button>
      </div>
      {children ? <div className="mt-4 flex flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  );
}

function PlaceSelect({
  id,
  label,
  placeholder,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  // Si llega un valor que no está en la lista (un enlace viejo, por ejemplo),
  // se agrega para que la lista muestre lo elegido en vez de otra opción.
  const opciones = value && !options.includes(value) ? [value, ...options] : options;

  return (
    <div className="relative">
      <label
        htmlFor={id}
        className="pointer-events-none absolute left-4 top-2 text-sm font-medium leading-5 text-tinta-suave"
      >
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(evento) => onChange(evento.target.value)}
        className="foco-sobre-marca block min-h-14 w-full cursor-pointer appearance-none truncate rounded-control bg-superficie pb-2 pl-4 pr-11 pt-7 text-base font-semibold text-tinta"
      >
        <option value="">{placeholder}</option>
        {opciones.map((opcion) => (
          <option key={opcion} value={opcion}>
            {opcion}
          </option>
        ))}
      </select>
      <IconChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-4 top-1/2 size-5 -translate-y-1/2 text-tinta-suave"
      />
    </div>
  );
}
