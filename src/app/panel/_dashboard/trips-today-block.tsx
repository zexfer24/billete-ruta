import Link from "next/link";
import type { AgencyDepartureRow } from "@/modules/catalog";
import { departureStatusLabel, departureStatusTone } from "@/lib/labels";
import { formatCaracasTime24 } from "@/lib/time";
import { ClickableRow } from "@/components/clickable-row";
import {
  EmptyState,
  PANEL_TD_CLASS,
  PANEL_TH_CLASS,
  SectionCard,
  StatusBadge,
  panelButtonClass,
} from "@/components/panel-ui";
import { IconBus, IconChevronRight } from "@/components/icons";
import { sortTodayDepartures } from "./attention";
import { tripMovementText } from "./movements";
import { ResponsiveTable } from "./responsive-table";
import { TRIPS_TODAY_SECTION } from "./section-texts";

/** Cuántas salidas del día muestra la tabla de escritorio antes de remitir a "Salidas". */
const MAX_FILAS_TABLA = 8;

/**
 * Cuántas tarjetas se muestran por debajo de `xl` (teléfono y tableta): cada
 * tarjeta ocupa mucho más alto que una fila, y el resto del tablero no debe
 * quedar lejos. `sortTodayDepartures` ya deja al final las finalizadas y las
 * canceladas, así que las visibles son las que importan ahora.
 */
const MAX_TARJETAS = 4;

/** Enlace de texto con objetivo táctil de 44 px (spec 1.10). */
const TEXT_LINK_CLASS =
  "foco inline-flex min-h-11 items-center rounded-sm px-1 font-semibold text-marca-700 hover:underline";

/** "11:00 · Caracas → Barinas": el mismo signo de ruta que el resto del panel. */
function routeLabel(salida: AgencyDepartureRow): string {
  return `${salida.origin} → ${salida.destination}`;
}

function StatusOf({ salida }: { salida: AgencyDepartureRow }) {
  return <StatusBadge label={departureStatusLabel(salida.status)} tone={departureStatusTone(salida.status)} />;
}

/** "Se muestran 4 de 12 salidas de hoy. Ver todas", solo si hay más de las visibles. */
function MoreNote({ shown, total, className }: { shown: number; total: number; className: string }) {
  if (total <= shown) return null;
  return (
    <p className={`text-sm text-tinta-suave ${className}`}>
      Se muestran {shown} de {total} salidas de hoy.{" "}
      <Link href="/panel/salidas" className={TEXT_LINK_CLASS}>
        Ver todas
      </Link>
    </p>
  );
}

/**
 * "Salidas de hoy" del tablero: las del día con sus movimientos (embarque,
 * partida y llegada) en una sola frase. En escritorio es una tabla cuya fila
 * entera abre la salida (con un único enlace, la ruta, para el teclado); en
 * pantallas angostas, tarjetas que son en sí mismas el enlace.
 */
export async function TripsTodayBlock({
  departures,
  createDepartureHref,
}: {
  departures: Promise<AgencyDepartureRow[]>;
  createDepartureHref: string;
}) {
  const salidas = sortTodayDepartures(await departures);
  const filas = salidas.slice(0, MAX_FILAS_TABLA);
  const tarjetas = salidas.slice(0, MAX_TARJETAS);

  return (
    <SectionCard
      title={TRIPS_TODAY_SECTION.title}
      description={TRIPS_TODAY_SECTION.description}
      action={
        <Link href="/panel/salidas" className={panelButtonClass("secundario")}>
          {TRIPS_TODAY_SECTION.actionLabel}
        </Link>
      }
    >
      {salidas.length === 0 ? (
        <EmptyState
          icon={<IconBus />}
          title="No hay salidas programadas para hoy"
          description="Crea una salida para empezar a vender pasajes en esa ruta."
          action={
            <Link href={createDepartureHref} scroll={false} className={panelButtonClass("secundario")}>
              Crear una salida
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          <ResponsiveTable
            cards={
              <>
                {tarjetas.map((salida) => (
                  <li key={salida.id}>
                    <Link
                      href={`/panel/salidas/${salida.id}`}
                      className="foco flex h-full items-center gap-3 rounded-tarjeta border border-borde bg-superficie p-4 shadow-1 transition-colors duration-150 ease-out hover:bg-marca-50/60 motion-reduce:transition-none"
                    >
                      <span className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className="flex flex-wrap items-start justify-between gap-2">
                          <span className="tabular min-w-0 text-base font-semibold text-tinta">
                            {formatCaracasTime24(salida.departsAt)} · {routeLabel(salida)}
                          </span>
                          <StatusOf salida={salida} />
                        </span>
                        <span className="text-sm text-tinta-suave">
                          {salida.vehiclePlate} · {salida.driverName}
                        </span>
                        <span className="tabular text-[15px] font-medium text-tinta">{tripMovementText(salida)}</span>
                      </span>
                      <IconChevronRight className="size-5 shrink-0 text-marca-700" />
                    </Link>
                  </li>
                ))}
              </>
            }
            table={
              <table className="w-full text-left">
                <thead className="border-b border-borde">
                  <tr>
                    <th scope="col" className={PANEL_TH_CLASS}>
                      Hora
                    </th>
                    <th scope="col" className={PANEL_TH_CLASS}>
                      Ruta, bus y chofer
                    </th>
                    <th scope="col" className={PANEL_TH_CLASS}>
                      Estado
                    </th>
                    <th scope="col" className={PANEL_TH_CLASS}>
                      Movimientos
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filas.map((salida) => (
                    <ClickableRow
                      key={salida.id}
                      href={`/panel/salidas/${salida.id}`}
                      className="border-b border-borde last:border-0"
                    >
                      <td className={`${PANEL_TD_CLASS} tabular text-base font-semibold`}>
                        {formatCaracasTime24(salida.departsAt)}
                      </td>
                      <td className={PANEL_TD_CLASS}>
                        <Link href={`/panel/salidas/${salida.id}`} className={`${TEXT_LINK_CLASS} -mx-1`}>
                          {routeLabel(salida)}
                        </Link>
                        <span className="block text-tinta-suave">
                          {salida.vehiclePlate} · {salida.driverName}
                        </span>
                      </td>
                      <td className={PANEL_TD_CLASS}>
                        <StatusOf salida={salida} />
                      </td>
                      <td className={`${PANEL_TD_CLASS} tabular`}>{tripMovementText(salida)}</td>
                    </ClickableRow>
                  ))}
                </tbody>
              </table>
            }
          />

          <MoreNote shown={tarjetas.length} total={salidas.length} className="xl:hidden" />
          <MoreNote shown={filas.length} total={salidas.length} className="hidden xl:block" />
        </div>
      )}
    </SectionCard>
  );
}
