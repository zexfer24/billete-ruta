import Link from "next/link";
import type { AgencyDepartureRow } from "@/modules/catalog";
import { departureStatusLabel, departureStatusTone } from "@/lib/labels";
import { formatCaracasTime24 } from "@/lib/time";
import { ClickableRow } from "@/components/clickable-row";
import {
  EmptyState,
  PANEL_TD_CLASS,
  PANEL_TH_CLASS,
  StatusBadge,
  panelButtonClass,
} from "@/components/panel-ui";
import { IconBus, IconChevronRight } from "@/components/icons";
import { isOverdue, sortTodayDepartures } from "./attention";
import { DashboardSection } from "./section-card";
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

/**
 * Estado de la salida. Una programada cuya hora ya pasó se marca "Atrasada"
 * en tono de alerta, igual que la avisa "Lo que necesita tu atención": si no,
 * la misma salida salía como "Programada" justo debajo del aviso.
 */
function StatusOf({ salida, now }: { salida: AgencyDepartureRow; now: Date }) {
  if (isOverdue(salida, now)) return <StatusBadge label="Atrasada" tone="alerta" />;
  return <StatusBadge label={departureStatusLabel(salida.status)} tone={departureStatusTone(salida.status)} />;
}

/**
 * Movimientos de la salida; si está atrasada, a qué hora debía salir. `null`
 * si todavía no pasó nada: el estado ya lo dice.
 */
function movementOf(salida: AgencyDepartureRow, now: Date): string | null {
  if (isOverdue(salida, now)) return `Debía salir a las ${formatCaracasTime24(salida.departsAt)}`;
  return tripMovementText(salida);
}

/** Celda de movimientos: sin hitos, un guion y, para lectores de pantalla, la frase. */
function MovementCell({ text }: { text: string | null }) {
  if (text) return <>{text}</>;
  return (
    <>
      <span aria-hidden="true" className="text-tinta-tenue">
        —
      </span>
      <span className="sr-only">Sin movimientos todavía</span>
    </>
  );
}

/**
 * "Se muestran 4 de 12 salidas de hoy", solo si hay más de las visibles. Sin
 * enlace propio: "Ver todas las salidas" ya está en la cabecera de la sección.
 */
function MoreNote({ shown, total, className }: { shown: number; total: number; className: string }) {
  if (total <= shown) return null;
  return (
    <p className={`text-sm text-tinta-suave ${className}`}>
      Se muestran {shown} de {total} salidas de hoy.
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
  now,
  createDepartureHref,
}: {
  departures: Promise<AgencyDepartureRow[]>;
  now: Date;
  createDepartureHref: string;
}) {
  const salidas = sortTodayDepartures(await departures);
  const filas = salidas.slice(0, MAX_FILAS_TABLA);
  const tarjetas = salidas.slice(0, MAX_TARJETAS);

  return (
    <DashboardSection
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
                {tarjetas.map((salida) => {
                  const movimiento = movementOf(salida, now);
                  return (
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
                            <StatusOf salida={salida} now={now} />
                          </span>
                          <span className="text-sm text-tinta-suave">
                            {salida.vehiclePlate} · {salida.driverName}
                          </span>
                          {movimiento ? (
                            <span className="tabular text-[15px] font-medium text-tinta">{movimiento}</span>
                          ) : null}
                        </span>
                        <IconChevronRight className="size-5 shrink-0 text-marca-700" />
                      </Link>
                    </li>
                  );
                })}
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
                        <StatusOf salida={salida} now={now} />
                      </td>
                      <td className={`${PANEL_TD_CLASS} tabular`}>
                        <MovementCell text={movementOf(salida, now)} />
                      </td>
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
    </DashboardSection>
  );
}
