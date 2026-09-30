import Link from "next/link";
import { ClickableRow } from "@/components/clickable-row";
import { IconChevronRight, IconRoute } from "@/components/icons";
import {
  EmptyState,
  MobileCard,
  PANEL_TD_CLASS,
  PANEL_TH_CLASS,
  StatusBadge,
  TableShell,
  panelButtonClass,
} from "@/components/panel-ui";
import { cx } from "@/components/ui-classes";
import { departureStatusLabel, departureStatusTone } from "@/lib/labels";
import { formatCaracasDate, formatCaracasDateTime24, formatCaracasTime24, formatDuration } from "@/lib/time";
import { agencyMovements } from "@/modules/reports";
import { countLabel, formatCount } from "../_shared/format";
import { MobileCardList, TimeCell } from "../_shared/lists";
import { describeAdminRange, withQuery, type AdminRange } from "../_shared/period";
import { MOVEMENTS_PATH, movementsHref, tripStatus } from "./movements";

/** Tope de filas de `agencyMovements`; si se alcanza, se avisa. */
const MOVEMENTS_LIMIT = 300;

function time(date: Date | null) {
  return date ? { time: formatCaracasTime24(date), date: formatCaracasDate(date) } : {};
}

/**
 * Lista de movimientos del periodo y la agencia elegidos: tabla en escritorio
 * y tarjetas en móvil. Cada viaje abre su detalle en el panel lateral. Un
 * viaje sin salida o sin llegada muestra su estado ("Embarcando", "En ruta")
 * en vez de una raya.
 */
export async function MovementsList({
  range,
  agencyId,
  agencyName,
  selectedTrip,
}: {
  range: AdminRange;
  agencyId?: string;
  agencyName?: string;
  selectedTrip?: string;
}) {
  const movements = await agencyMovements(range.from, range.to, agencyId);
  const rangeText = describeAdminRange(range);

  if (movements.length === 0) {
    const action = agencyId ? (
      <Link href={movementsHref(range, undefined)} className={panelButtonClass("secundario")}>
        Ver todas las agencias
      </Link>
    ) : range.period !== "30d" ? (
      <Link href={withQuery(MOVEMENTS_PATH, { periodo: "30d" })} className={panelButtonClass("secundario")}>
        Ver los últimos 30 días
      </Link>
    ) : undefined;

    return (
      <EmptyState
        icon={<IconRoute />}
        title={agencyName ? `${agencyName} no tiene movimientos en este periodo` : "No hay movimientos en este periodo"}
        description="Un movimiento aparece cuando la agencia inicia el embarque de una salida. Prueba con otro periodo."
        action={action}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-semibold text-tinta-suave">
        {countLabel(movements.length, "viaje", "viajes")}
        {agencyName ? ` de ${agencyName}` : " de todas las agencias"}.
      </p>

      <TableShell
        mobile={
          <MobileCardList
            label="Movimientos"
            moreNoun={["viaje", "viajes"]}
            items={movements.map((m) => {
              const status = tripStatus(m);
              return (
                <MobileCard
                  key={m.tripLogId}
                  title={m.agencyName}
                  subtitle={`${m.origin} → ${m.destination}`}
                  status={
                    <StatusBadge label={departureStatusLabel(status)} tone={departureStatusTone(status)} />
                  }
                  details={[
                    {
                      label: "Embarque",
                      value: m.boardingStartedAt ? formatCaracasDateTime24(m.boardingStartedAt) : "—",
                    },
                    { label: "Llegada", value: m.arrivedAt ? formatCaracasDateTime24(m.arrivedAt) : "—" },
                    {
                      label: "Duración",
                      value: m.durationMinutes !== null ? formatDuration(m.durationMinutes) : "—",
                    },
                    { label: "Pasajeros", value: formatCount(m.passengerCount) },
                  ]}
                  action={
                    <Link
                      href={movementsHref(range, agencyId, m.tripLogId)}
                      scroll={false}
                      className={panelButtonClass("secundario", "md", "w-full")}
                    >
                      Ver pasajeros a bordo
                    </Link>
                  }
                />
              );
            })}
          />
        }
      >
        <table className="w-full min-w-[56rem] text-left">
          <caption className="sr-only">Movimientos de las agencias. {rangeText}.</caption>
          <thead>
            <tr className="border-b border-borde">
              <th scope="col" className={PANEL_TH_CLASS}>
                Agencia y ruta
              </th>
              <th scope="col" className={PANEL_TH_CLASS}>
                Chofer y unidad
              </th>
              <th scope="col" className={PANEL_TH_CLASS}>
                Embarque
              </th>
              <th scope="col" className={PANEL_TH_CLASS}>
                Salida
              </th>
              <th scope="col" className={PANEL_TH_CLASS}>
                Llegada
              </th>
              <th scope="col" className={PANEL_TH_CLASS}>
                Duración
              </th>
              <th scope="col" className={cx(PANEL_TH_CLASS, "text-right")}>
                Pasajeros
              </th>
              <th scope="col" className={PANEL_TH_CLASS}>
                <span className="sr-only">Detalle</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {movements.map((m) => {
              const href = movementsHref(range, agencyId, m.tripLogId);
              const status = tripStatus(m);
              return (
                <ClickableRow
                  key={m.tripLogId}
                  href={href}
                  selected={m.tripLogId === selectedTrip}
                  className="cursor-pointer border-b border-borde last:border-0"
                >
                  <td className={PANEL_TD_CLASS}>
                    <span className="block font-semibold">{m.agencyName}</span>
                    <span className="block text-sm text-tinta-suave">
                      {m.origin} → {m.destination}
                    </span>
                  </td>
                  <td className={PANEL_TD_CLASS}>
                    <span className="block">{m.driverName}</span>
                    <span className="tabular block text-sm text-tinta-suave">{m.vehiclePlate}</span>
                  </td>
                  <td className={PANEL_TD_CLASS}>
                    <TimeCell {...time(m.boardingStartedAt)} />
                  </td>
                  <td className={PANEL_TD_CLASS}>
                    {m.departedAt ? (
                      <TimeCell {...time(m.departedAt)} />
                    ) : (
                      <StatusBadge label={departureStatusLabel(status)} tone={departureStatusTone(status)} />
                    )}
                  </td>
                  <td className={PANEL_TD_CLASS}>
                    {m.arrivedAt ? (
                      <TimeCell {...time(m.arrivedAt)} />
                    ) : m.departedAt ? (
                      <StatusBadge label={departureStatusLabel(status)} tone={departureStatusTone(status)} />
                    ) : (
                      <span className="text-tinta-tenue">—</span>
                    )}
                  </td>
                  <td className={cx(PANEL_TD_CLASS, "tabular")}>
                    {m.durationMinutes !== null ? formatDuration(m.durationMinutes) : "—"}
                  </td>
                  <td className={cx(PANEL_TD_CLASS, "tabular text-right font-semibold")}>
                    {formatCount(m.passengerCount)}
                  </td>
                  <td className={cx(PANEL_TD_CLASS, "text-right")}>
                    <Link href={href} scroll={false} className={panelButtonClass("fantasma", "sm", "whitespace-nowrap")}>
                      Ver detalle
                      <IconChevronRight className="size-4 shrink-0" />
                    </Link>
                  </td>
                </ClickableRow>
              );
            })}
          </tbody>
        </table>
      </TableShell>

      {movements.length >= MOVEMENTS_LIMIT ? (
        <p className="text-sm text-tinta-suave">
          Se muestran los {formatCount(MOVEMENTS_LIMIT)} viajes más recientes. Elige un periodo más corto o una
          agencia para ver el resto.
        </p>
      ) : null}
    </div>
  );
}
