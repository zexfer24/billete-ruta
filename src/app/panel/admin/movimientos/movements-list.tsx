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
import { MobileCardList } from "../_shared/lists";
import { describeAdminRange, withQuery, type AdminRange } from "../_shared/period";
import { LineSkeleton, TableSkeleton } from "../_shared/skeletons";
import { MOVEMENTS_PATH, hourFrom, movementsHref, tripStatus } from "./movements";

/** Tope de filas de `agencyMovements`; si se alcanza, se avisa. */
const MOVEMENTS_LIMIT = 300;

/** Texto del enlace al detalle de un viaje, el mismo en la tabla y en las tarjetas. */
const DETAIL_LABEL = "Ver pasajeros a bordo";

/**
 * Cabeceras de la tabla de movimientos; la última es la del enlace al
 * detalle, sin título visible. La silueta de carga usa las mismas.
 */
const MOVEMENT_COLUMNS = ["Agencia y ruta", "Chofer", "Salió", "Llegó", "Duración", "Pasajeros", ""] as const;

/**
 * Lista de movimientos del periodo y la agencia elegidos: tabla en escritorio
 * y tarjetas en móvil, con los mismos datos. Cada viaje abre su detalle en el
 * panel lateral. Un viaje sin salida o sin llegada muestra su estado
 * ("Embarcando", "En ruta") en vez de una raya; uno que ya llegó no lo
 * repite. La fecha va una sola vez, bajo la hora de salida, y la llegada y el
 * embarque solo agregan el día si caen en otro.
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
              const reference = m.departedAt ?? m.boardingStartedAt;
              return (
                <MobileCard
                  key={m.tripLogId}
                  title={m.agencyName}
                  subtitle={`${m.origin} → ${m.destination}`}
                  status={
                    status === "FINALIZADA" ? undefined : (
                      <StatusBadge label={departureStatusLabel(status)} tone={departureStatusTone(status)} />
                    )
                  }
                  details={[
                    {
                      label: "Salió",
                      value: m.departedAt ? formatCaracasDateTime24(m.departedAt) : "Todavía no",
                    },
                    { label: "Llegó", value: m.arrivedAt ? hourFrom(m.arrivedAt, reference) : "Todavía no" },
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
                      {DETAIL_LABEL}
                    </Link>
                  }
                />
              );
            })}
          />
        }
      >
        <table className="w-full min-w-[48rem] text-left">
          <caption className="sr-only">Movimientos de las agencias. {rangeText}.</caption>
          <thead>
            <tr className="border-b border-borde">
              {MOVEMENT_COLUMNS.map((column, index) => (
                <th
                  key={index}
                  scope="col"
                  className={cx(PANEL_TH_CLASS, "whitespace-nowrap", column === "Pasajeros" && "text-right")}
                >
                  {column || <span className="sr-only">Detalle</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {movements.map((m) => {
              const href = movementsHref(range, agencyId, m.tripLogId);
              const status = tripStatus(m);
              const reference = m.departedAt ?? m.boardingStartedAt;
              return (
                <ClickableRow
                  key={m.tripLogId}
                  href={href}
                  selected={m.tripLogId === selectedTrip}
                  className="cursor-pointer border-b border-borde align-top last:border-0"
                >
                  <td className={PANEL_TD_CLASS}>
                    <span className="block font-semibold">{m.agencyName}</span>
                    <span className="block text-sm text-tinta-suave">
                      {m.origin} → {m.destination}
                    </span>
                  </td>
                  <td className={PANEL_TD_CLASS}>
                    <span className="block">{m.driverName}</span>
                    <span className="tabular block whitespace-nowrap text-sm text-tinta-suave">{m.vehiclePlate}</span>
                  </td>
                  <td className={cx(PANEL_TD_CLASS, "whitespace-nowrap")}>
                    {m.departedAt ? (
                      <span className="tabular block font-semibold text-tinta">{formatCaracasTime24(m.departedAt)}</span>
                    ) : (
                      <StatusBadge label={departureStatusLabel(status)} tone={departureStatusTone(status)} />
                    )}
                    {reference ? (
                      <span className="tabular block text-sm text-tinta-suave">{formatCaracasDate(reference)}</span>
                    ) : null}
                    {m.boardingStartedAt ? (
                      <span className="tabular block text-sm text-tinta-suave">
                        Embarque desde {hourFrom(m.boardingStartedAt, reference)}
                      </span>
                    ) : null}
                  </td>
                  <td className={cx(PANEL_TD_CLASS, "whitespace-nowrap")}>
                    {m.arrivedAt ? (
                      <span className="tabular font-semibold text-tinta">{hourFrom(m.arrivedAt, reference)}</span>
                    ) : m.departedAt ? (
                      <StatusBadge label={departureStatusLabel(status)} tone={departureStatusTone(status)} />
                    ) : (
                      <span className="text-tinta-tenue">—</span>
                    )}
                  </td>
                  <td className={cx(PANEL_TD_CLASS, "tabular whitespace-nowrap")}>
                    {m.durationMinutes !== null ? formatDuration(m.durationMinutes) : "—"}
                  </td>
                  <td className={cx(PANEL_TD_CLASS, "tabular text-right font-semibold")}>
                    {formatCount(m.passengerCount)}
                  </td>
                  <td className={cx(PANEL_TD_CLASS, "px-2 text-right")}>
                    {/* Toda la fila abre el detalle; este enlace lo deja al alcance del teclado. */}
                    <Link
                      href={href}
                      scroll={false}
                      aria-label={`${DETAIL_LABEL}: ${m.agencyName}, ${m.origin} a ${m.destination}`}
                      className={panelButtonClass("fantasma", "sm", "px-2")}
                    >
                      <IconChevronRight className="size-5 shrink-0" />
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

/** Silueta de la lista de movimientos: el total y la tabla con sus cabeceras reales. */
export function MovementsListSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <LineSkeleton className="w-60" />
      <TableSkeleton columns={MOVEMENT_COLUMNS} rows={8} mobileAction />
    </div>
  );
}
