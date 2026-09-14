"use client";

import { formatCaracas } from "@/lib/time";
import { IconCheck } from "@/components/icons";
import type { DepartureOption } from "./counter-sale-form";

/**
 * Formatea un monto en USD recibido como texto desde el servidor, con coma
 * decimal y separador de miles, igual que el resto del panel.
 */
export function formatUsdString(value: string): string {
  const formateado = new Intl.NumberFormat("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));
  return `US$ ${formateado}`;
}

/** Paso 1 del asistente: elige la salida a vender, con cupo y tarifa visibles en cada tarjeta. */
export function StepDeparture({
  departures,
  selectedId,
  onSelect,
}: {
  departures: DepartureOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Salidas disponibles" className="flex flex-col gap-3">
      {departures.map((d) => {
        const selected = d.id === selectedId;
        return (
          <label
            key={d.id}
            className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border p-4 transition-colors duration-150 motion-reduce:transition-none ${
              selected
                ? "border-[var(--color-acento)] bg-[var(--color-acento-suave)]"
                : "border-[var(--color-borde)] bg-[var(--color-superficie)]"
            }`}
          >
            <input
              type="radio"
              name="departureId"
              value={d.id}
              checked={selected}
              onChange={() => onSelect(d.id)}
              className="h-5 w-5 shrink-0 accent-[var(--color-acento)]"
            />
            <div className="flex-1">
              <p className="font-semibold">
                {d.routeName}
                <span className="ml-1 font-normal text-[var(--color-texto-suave)]">
                  · {d.origin} → {d.destination}
                </span>
              </p>
              <p className="tabular mt-1 text-base text-[var(--color-texto-suave)]">
                {formatCaracas(new Date(d.departsAtIso), "dd/MM HH:mm")} · {d.available} cupos ·{" "}
                {formatUsdString(d.fareUsd)} por pasajero
              </p>
            </div>
            {selected ? (
              <IconCheck className="h-5 w-5 shrink-0 text-[var(--color-acento)]" title="Salida elegida" />
            ) : null}
          </label>
        );
      })}
    </div>
  );
}
