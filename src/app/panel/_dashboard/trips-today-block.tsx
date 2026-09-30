import Link from "next/link";
import type { AgencyDepartureRow } from "@/modules/catalog";
import { departureStatusLabel, departureStatusTone } from "@/lib/labels";
import { formatCaracasTime24 } from "@/lib/time";
import { ClickableRow } from "@/components/clickable-row";
import {
  EmptyState,
  MobileCard,
  PANEL_TD_CLASS,
  PANEL_TH_CLASS,
  SectionCard,
  StatusBadge,
  panelButtonClass,
} from "@/components/panel-ui";
import { IconBus } from "@/components/icons";
import { sortTodayDepartures } from "./attention";
import { ResponsiveTable } from "./responsive-table";

/** Cuántas salidas del día muestra el tablero antes de remitir a "Salidas". */
const MAX_FILAS = 8;

/** Hora del hito, o "Aún no" si todavía no ocurrió: nunca un guion sin explicar. */
function Hito({ date }: { date: Date | null }) {
  return date ? (
    <span className="tabular">{formatCaracasTime24(date)}</span>
  ) : (
    <span className="text-tinta-tenue">Aún no</span>
  );
}

/**
 * "Salidas de hoy" del tablero: las del día con sus horas de embarque,
 * partida y llegada. En escritorio es una tabla cuya fila entera abre la
 * salida (con un único enlace, la ruta, para el teclado); en pantallas
 * angostas, una lista de tarjetas.
 */
export async function TripsTodayBlock({
  departures,
  createDepartureHref,
}: {
  departures: Promise<AgencyDepartureRow[]>;
  createDepartureHref: string;
}) {
  const salidas = sortTodayDepartures(await departures);
  const visibles = salidas.slice(0, MAX_FILAS);

  return (
    <SectionCard
      title="Salidas de hoy"
      description="Cuándo embarcó, partió y llegó cada bus. Toca una salida para abrirla."
      action={
        <Link href="/panel/salidas" className={panelButtonClass("secundario")}>
          Ver todas las salidas
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
        <div className="flex flex-col gap-4">
          <ResponsiveTable
            cards={
              <>
                {visibles.map((salida) => (
                  <MobileCard
                    key={salida.id}
                    title={
                      <span className="tabular">
                        {formatCaracasTime24(salida.departsAt)} · {salida.routeName}
                      </span>
                    }
                    subtitle={`${salida.vehiclePlate} · ${salida.driverName}`}
                    status={
                      <StatusBadge
                        label={departureStatusLabel(salida.status)}
                        tone={departureStatusTone(salida.status)}
                      />
                    }
                    details={[
                      { label: "Embarcó", value: <Hito date={salida.boardingStartedAt} /> },
                      { label: "Partió", value: <Hito date={salida.departedAt} /> },
                      { label: "Llegó", value: <Hito date={salida.arrivedAt} /> },
                    ]}
                    action={
                      <Link
                        href={`/panel/salidas/${salida.id}`}
                        className={panelButtonClass("secundario", "md", "w-full")}
                      >
                        Abrir la salida
                      </Link>
                    }
                  />
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
                      Embarcó
                    </th>
                    <th scope="col" className={PANEL_TH_CLASS}>
                      Partió
                    </th>
                    <th scope="col" className={PANEL_TH_CLASS}>
                      Llegó
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visibles.map((salida) => (
                    <ClickableRow
                      key={salida.id}
                      href={`/panel/salidas/${salida.id}`}
                      className="border-b border-borde last:border-0"
                    >
                      <td className={`${PANEL_TD_CLASS} tabular text-base font-semibold`}>
                        {formatCaracasTime24(salida.departsAt)}
                      </td>
                      <td className={PANEL_TD_CLASS}>
                        <Link
                          href={`/panel/salidas/${salida.id}`}
                          className="foco rounded-sm font-semibold text-marca-700 hover:underline"
                        >
                          {salida.routeName}
                        </Link>
                        <span className="block text-tinta-suave">
                          {salida.vehiclePlate} · {salida.driverName}
                        </span>
                      </td>
                      <td className={PANEL_TD_CLASS}>
                        <StatusBadge
                          label={departureStatusLabel(salida.status)}
                          tone={departureStatusTone(salida.status)}
                        />
                      </td>
                      <td className={PANEL_TD_CLASS}>
                        <Hito date={salida.boardingStartedAt} />
                      </td>
                      <td className={PANEL_TD_CLASS}>
                        <Hito date={salida.departedAt} />
                      </td>
                      <td className={PANEL_TD_CLASS}>
                        <Hito date={salida.arrivedAt} />
                      </td>
                    </ClickableRow>
                  ))}
                </tbody>
              </table>
            }
          />

          {salidas.length > visibles.length ? (
            <p className="text-sm text-tinta-suave">
              Se muestran {visibles.length} de {salidas.length} salidas de hoy.{" "}
              <Link href="/panel/salidas" className="foco rounded-sm font-semibold text-marca-700 underline">
                Ver todas
              </Link>
            </p>
          ) : null}
        </div>
      )}
    </SectionCard>
  );
}
