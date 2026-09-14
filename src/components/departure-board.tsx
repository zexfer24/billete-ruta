import Link from "next/link";
import { agencyColor } from "@/lib/brand";
import { formatCaracasTime24, minutesUntil } from "@/lib/time";
import type { DepartureRowData } from "./departure-row";
import { IconLive, IconNavigation } from "./icons";
import { Card } from "./ui";

export interface DepartureBoardProps {
  departures: DepartureRowData[];
  now: Date;
  hrefFor?: (id: string) => string;
  limit?: number;
}

/** Tablero de bloques de color a ancho completo, al estilo de la pizarra de Transit. */
export function DepartureBoard({ departures, now, hrefFor, limit }: DepartureBoardProps) {
  const lista = typeof limit === "number" ? departures.slice(0, limit) : departures;

  if (lista.length === 0) {
    return <Card>No hay salidas en las próximas horas.</Card>;
  }

  return (
    <div className="overflow-hidden rounded-tarjeta">
      {lista.map((departure, indice) => {
        const color = agencyColor(departure.agencyId);
        const salidaProxima = minutesUntil(departure.departsAt, now) < 60;
        const esPrimero = indice === 0;
        const esUltimo = indice === lista.length - 1;

        const bloque = (
          <div
            className={[
              "flex min-h-24 items-center justify-between gap-4 px-5 py-4 text-white",
              esPrimero ? "rounded-t-tarjeta" : "",
              esUltimo ? "rounded-b-tarjeta" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={{ backgroundColor: color.bg }}
          >
            <div className="flex flex-col gap-1">
              <span className="tabular text-4xl font-extrabold">
                {formatCaracasTime24(departure.departsAt)}
              </span>
              <span className="flex items-center gap-1.5 text-xl font-bold">
                <IconNavigation aria-hidden="true" width={18} height={18} />
                {departure.destination}
              </span>
              <span className="text-sm text-white/90">
                {departure.agencyName} · {departure.origin}
              </span>
            </div>
            <div className="flex flex-col items-end text-right">
              {salidaProxima ? (
                <>
                  <span className="flex items-center gap-1.5 text-4xl font-extrabold">
                    <IconLive aria-hidden="true" />
                    {minutesUntil(departure.departsAt, now)}
                  </span>
                  <span className="text-sm">min</span>
                </>
              ) : (
                <span className="tabular text-2xl font-bold">{formatCaracasTime24(departure.departsAt)}</span>
              )}
            </div>
          </div>
        );

        if (hrefFor) {
          return (
            <Link
              key={departure.id}
              href={hrefFor(departure.id)}
              className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
            >
              {bloque}
            </Link>
          );
        }

        return <div key={departure.id}>{bloque}</div>;
      })}
    </div>
  );
}
