"use client";

import { useEffect, useState } from "react";

export interface TaxSnapshot {
  totalUsd: string;
  reservations: number;
  passengers: number;
}

interface TableroApiResponse {
  tax: TaxSnapshot;
}

const POLL_INTERVAL_MS = 30_000;

/**
 * Tarjeta de la tasa de salida de las últimas 24 horas. Se autoactualiza
 * consultando /api/admin/tablero cada 30 segundos, sin recargar la página.
 */
export function LiveTaxCard({ initial }: { initial: TaxSnapshot }) {
  const [tax, setTax] = useState<TaxSnapshot>(initial);
  const [stale, setStale] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function poll(): Promise<void> {
      try {
        const response = await fetch("/api/admin/tablero", { cache: "no-store" });
        if (!response.ok) {
          if (!cancelled) setStale(true);
          return;
        }
        const data = (await response.json()) as TableroApiResponse;
        if (!cancelled) {
          setTax(data.tax);
          setStale(false);
        }
      } catch {
        if (!cancelled) setStale(true);
      }
    }

    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)] p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-[var(--color-texto-suave)]">
          Tasa de salida recaudada (últimas 24 h)
        </p>
        <span className="flex shrink-0 items-center gap-1 text-xs text-[var(--color-exito)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-exito)]" aria-hidden />
          {stale ? "sin conexión" : "en vivo"}
        </span>
      </div>
      <p className="mt-2 text-3xl font-semibold tracking-tight tabular">{tax.totalUsd}</p>
      <p className="mt-1 text-sm text-[var(--color-texto-suave)] tabular">
        {tax.reservations} reserva(s) pagada(s) · {tax.passengers} pasajero(s)
      </p>
    </div>
  );
}
