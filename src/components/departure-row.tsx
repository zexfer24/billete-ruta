import Link from "next/link";
import type { ReactNode } from "react";
import { formatDuration, formatRelativeDeparture, minutesUntil } from "@/lib/time";
import { AgencyBadge } from "./agency-badge";
import { IconLive } from "./icons";

export interface DepartureRowData {
  id: string;
  agencyId: string;
  agencyName: string;
  origin: string;
  destination: string;
  departsAt: Date;
  estimatedMinutes: number;
  fareUsd: string;
  available: number;
  capacity: number;
}

interface DepartureRowProps {
  departure: DepartureRowData;
  now: Date;
  action?: ReactNode;
  href?: string;
  selected?: boolean;
}

/**
 * Fila de salida en línea de tiempo (Transit): raíl con puntos a los lados y
 * el bloque de agencia en medio, hora relativa a la izquierda, precio y
 * cupos a la derecha. Sin hooks: se puede importar desde componentes cliente.
 */
export function DepartureRow({ departure, now, action, href, selected }: DepartureRowProps) {
  const salidaProxima = minutesUntil(departure.departsAt, now) < 60;
  const precio = Number(departure.fareUsd).toLocaleString("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const contenido = (
    <>
      <div className="flex items-center gap-3">
        <span className="h-2 w-2 shrink-0 rounded-full bg-borde" aria-hidden="true" />
        <span className="h-px flex-1 bg-borde" aria-hidden="true" />
        <AgencyBadge agencyId={departure.agencyId} name={departure.agencyName} size="md" />
        <span className="h-px flex-1 bg-borde" aria-hidden="true" />
        <span className="h-2 w-2 shrink-0 rounded-full bg-borde" aria-hidden="true" />
        <span className="shrink-0 text-sm text-tinta-suave">{formatDuration(departure.estimatedMinutes)}</span>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <span
          className={`flex items-center gap-1.5 ${salidaProxima ? "font-bold text-en-vivo" : "text-tinta"}`}
        >
          {salidaProxima ? <IconLive aria-hidden="true" /> : null}
          {formatRelativeDeparture(departure.departsAt, now)}
        </span>
        <div className="text-right">
          <p className="tabular font-bold">$ {precio}</p>
          <p className={`text-sm ${departure.available > 0 ? "text-tinta-suave" : "text-peligro"}`}>
            {departure.available > 0 ? `${departure.available} cupos` : "Sin cupo"}
          </p>
        </div>
      </div>
      <p className="mt-1 text-sm text-tinta-suave">
        {departure.origin} → {departure.destination} · {departure.agencyName}
      </p>
      {action ? <div className="mt-3 flex justify-end">{action}</div> : null}
    </>
  );

  const claseTarjeta = `rounded-tarjeta bg-white p-4 ${selected ? "ring-2 ring-marca" : ""}`;

  if (href && !action) {
    return (
      <Link
        href={href}
        className={`block ${claseTarjeta} transition-colors duration-150 hover:bg-marca-clara/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marca motion-reduce:transition-none`}
      >
        {contenido}
      </Link>
    );
  }

  return <div className={claseTarjeta}>{contenido}</div>;
}
