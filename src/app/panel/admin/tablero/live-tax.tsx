"use client";

import { useCallback, useEffect, useState } from "react";
import { IconLive, IconRefresh, IconWarning } from "@/components/icons";
import { Pill } from "@/components/ui";
import { panelButtonClass } from "@/components/ui-classes";
import { formatCaracasTime24 } from "@/lib/time";
import { countLabel } from "../_shared/format";

export interface TaxSnapshot {
  totalUsd: string;
  reservations: number;
  passengers: number;
  /** Momento de la cifra, en ISO 8601. */
  generatedAt: string;
}

interface TableroApiResponse {
  tax: Omit<TaxSnapshot, "generatedAt">;
  generatedAt: string;
}

const POLL_INTERVAL_MS = 30_000;

function isTableroResponse(value: unknown): value is TableroApiResponse {
  if (typeof value !== "object" || value === null) return false;
  const data = value as Partial<TableroApiResponse>;
  return (
    typeof data.generatedAt === "string" &&
    typeof data.tax?.totalUsd === "string" &&
    typeof data.tax.reservations === "number" &&
    typeof data.tax.passengers === "number"
  );
}

/**
 * Tasa de salida cobrada en las últimas 24 horas, destacada arriba del
 * tablero. Se actualiza sola cada 30 segundos consultando
 * /api/admin/tablero, solo mientras la pestaña está a la vista (al volver a
 * ella se actualiza enseguida). Si no puede actualizar, lo dice en ámbar con
 * la hora de la última cifra y ofrece intentarlo de nuevo; el cambio de
 * estado se anuncia a los lectores de pantalla.
 */
export function LiveTaxCard({ initial }: { initial: TaxSnapshot }) {
  const [tax, setTax] = useState<TaxSnapshot>(initial);
  const [stale, setStale] = useState(false);
  const [checking, setChecking] = useState(false);

  const poll = useCallback(async (): Promise<void> => {
    setChecking(true);
    try {
      const response = await fetch("/api/admin/tablero", { cache: "no-store" });
      if (!response.ok) {
        setStale(true);
        return;
      }
      const data: unknown = await response.json();
      if (!isTableroResponse(data)) {
        setStale(true);
        return;
      }
      setTax({ ...data.tax, generatedAt: data.generatedAt });
      setStale(false);
    } catch {
      setStale(true);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;

    function start() {
      if (interval === undefined) interval = setInterval(() => void poll(), POLL_INTERVAL_MS);
    }
    function stop() {
      if (interval !== undefined) clearInterval(interval);
      interval = undefined;
    }
    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        void poll();
        start();
      } else {
        stop();
      }
    }

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [poll]);

  const updatedAt = formatCaracasTime24(new Date(tax.generatedAt));

  return (
    <section
      aria-labelledby="tasa-en-vivo-titulo"
      className="relative flex flex-col gap-4 overflow-hidden rounded-tarjeta border border-marca-200 bg-superficie p-5 shadow-1 sm:p-6"
    >
      <span className="absolute inset-x-0 top-0 h-1.5 bg-marca-600" aria-hidden="true" />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="tasa-en-vivo-titulo" className="text-lg font-semibold text-tinta">
            Tasa de salida cobrada
          </h2>
          <p className="text-sm leading-snug text-tinta-suave">
            Últimas 24 horas, de todas las agencias. Se actualiza sola.
          </p>
        </div>
        <div className="shrink-0">
          {stale ? (
            <Pill tone="alerta" icon={<IconWarning />}>
              Sin conexión
            </Pill>
          ) : (
            <Pill tone="exito" icon={<IconLive />}>
              En vivo
            </Pill>
          )}
        </div>
      </div>

      <div>
        <p className="tabular text-4xl font-bold tracking-tight text-tinta sm:text-5xl">{tax.totalUsd}</p>
        <p className="tabular mt-1.5 text-base text-tinta-suave">
          {countLabel(tax.reservations, "reserva pagada", "reservas pagadas")} ·{" "}
          {countLabel(tax.passengers, "pasajero", "pasajeros")}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-borde pt-3">
        <p aria-live="polite" className="tabular text-sm leading-snug text-tinta-suave">
          {stale
            ? `No pudimos actualizar la cifra. Es la de las ${updatedAt}; lo intentamos de nuevo en 30 segundos.`
            : `Actualizado a las ${updatedAt}.`}
        </p>
        {stale ? (
          <button
            type="button"
            onClick={() => void poll()}
            disabled={checking}
            className={panelButtonClass("secundario", "md")}
          >
            <IconRefresh
              className={`size-5 shrink-0 ${checking ? "animate-spin motion-reduce:animate-none" : ""}`}
            />
            {checking ? "Actualizando…" : "Intentar de nuevo"}
          </button>
        ) : null}
      </div>
    </section>
  );
}
