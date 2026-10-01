import Link from "next/link";
import { ClickableRow } from "@/components/clickable-row";
import { IconChevronRight, IconRoute } from "@/components/icons";
import { EmptyState, MobileCard, StatusBadge, TableShell, panelButtonClass } from "@/components/panel-ui";
import { cx } from "@/components/ui-classes";
import { departureStatusLabel, departureStatusTone } from "@/lib/labels";
import { formatCaracasDate, formatCaracasDateTime24, formatCaracasTime24, formatDuration } from "@/lib/time";
import { agencyMovements } from "@/modules/reports";
import { countLabel, formatCount } from "../_shared/format";
import { ADMIN_TD_CLASS, ADMIN_TH_CLASS, MobileCardList, TimeCell } from "../_shared/lists";
import { describeAdminRange, withQuery, type AdminRange } from "../_shared/period";
import { LineSkeleton, TableSkeleton } from "../_shared/skeletons";
import { MOVEMENTS_PATH, hourFrom, movementsHref, tripStatus } from "./movements";

/** Tope de filas de `agencyMovements`; si se alcanza, se avisa. */
const MOVEMENTS_LIMIT = 300;

/** Texto del enlace al detalle de un viaje, el mismo en la tabla y en las tarjetas. */
const DETAIL_LABEL = "Ver pasajeros a bordo";

/**
 * Cabeceras de la tabla de movimientos; la última es la del enlace al
 * detalle, sin título visible. La silueta de carga usa las mismas. La
 * duración va bajo la hora de llegada ("Duró 14 h 10 min"), no en su propia
 * columna, para que la tabla quepa entera desde 768 px sin esconder la flecha
 * del detalle a la derecha.
 */
const MOVEMENT_COLUMNS = ["Agencia y ruta", "Chofer", "Salió", "Llegó", "Pasajeros", ""] as const;

/** "Embarque desde 17:40", con la fecha completa si el embarque empezó otro día que la salida. */
function boardingText(boardingStartedAt: Date, reference: Date | null): string {
  const hour = hourFrom(boardingStartedAt, reference);
  if (!hour) return "";
  return `Embarque desde ${hour.time}${hour.date ? ` del ${hour.date}` : ""}`;
}

/**
 * Lista de movimientos del periodo y la agencia elegidos: tabla en escritorio
 * y tarjetas en móvil, con los mismos datos. Cada viaje abre su detalle en el
 * panel lateral. Un viaje sin salida o sin llegada muestra su estado
 * ("Embarcando", "En ruta") en vez de una raya; uno que ya llegó no lo
 * repite. En la tabla, cada hora va como en `TimeCell` (la hora y debajo la
 * fecha, que solo se repite en la llegada o el embarque si caen otro día); en
 * las tarjetas, fecha y hora en una línea ("29/09/2026 18:07").
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
                    status === "FINALIZADA" ? undefined : (
                      <StatusBadge label={departureStatusLabel(status)} tone={departureStatusTone(status)} />
                    )
                  }
                  details={[
                    {
                      label: "Embarque",
                      value: m.boardingStartedAt ? formatCaracasDateTime24(m.boardingStartedAt) : "—",
                    },
                    {
                      label: "Salió",
                      value: m.departedAt ? formatCaracasDateTime24(m.departedAt) : "Todavía no",
                    },
                    { label: "Llegó", value: m.arrivedAt ? formatCaracasDateTime24(m.arrivedAt) : "Todavía no" },
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
        {/* `relative`: la cabecera "Detalle" solo para lectores de pantalla es
            absoluta; así queda dentro del marco y no ensancha la página. */}
        <table className="relative w-full text-left">
          <caption className="sr-only">Movimientos de las agencias. {rangeText}.</caption>
          <thead>
            <tr className="border-b border-borde">
              {MOVEMENT_COLUMNS.map((column, index) => (
                <th
                  key={index}
                  scope="col"
                  className={cx(ADMIN_TH_CLASS, column === "Pasajeros" && "text-right")}
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
              const arrival = hourFrom(m.arrivedAt, reference);
              return (
                <ClickableRow
                  key={m.tripLogId}
                  href={href}
                  selected={m.tripLogId === selectedTrip}
                  className="cursor-pointer border-b border-borde align-top last:border-0"
                >
                  <td className={ADMIN_TD_CLASS}>
                    <span className="block font-semibold">{m.agencyName}</span>
                    <span className="block text-sm text-tinta-suave">
                      {m.origin} → {m.destination}
                    </span>
                  </td>
                  <td className={ADMIN_TD_CLASS}>
                    <span className="block">{m.driverName}</span>
                    <span className="tabular block whitespace-nowrap text-sm text-tinta-suave">{m.vehiclePlate}</span>
                  </td>
                  <td className={ADMIN_TD_CLASS}>
                    {m.departedAt ? (
                      <TimeCell time={formatCaracasTime24(m.departedAt)} date={formatCaracasDate(m.departedAt)} />
                    ) : (
                      <span className="flex flex-col items-start gap-1">
                        <StatusBadge label={departureStatusLabel(status)} tone={departureStatusTone(status)} />
                        {reference ? (
                          <span className="tabular text-sm text-tinta-suave">{formatCaracasDate(reference)}</span>
                        ) : null}
                      </span>
                    )}
                    {m.boardingStartedAt ? (
                      <span className="tabular block text-sm text-tinta-suave">
                        {boardingText(m.boardingStartedAt, reference)}
                      </span>
                    ) : null}
                  </td>
                  <td className={ADMIN_TD_CLASS}>
                    {arrival ? (
                      <TimeCell time={arrival.time} date={arrival.date} />
                    ) : m.departedAt ? (
                      <StatusBadge label={departureStatusLabel(status)} tone={departureStatusTone(status)} />
                    ) : (
                      <span className="text-tinta-tenue">—</span>
                    )}
                    {m.durationMinutes !== null ? (
                      <span className="tabular block text-sm text-tinta-suave">
                        Duró {formatDuration(m.durationMinutes)}
                      </span>
                    ) : null}
                  </td>
                  <td className={cx(ADMIN_TD_CLASS, "tabular text-right font-semibold")}>
                    {formatCount(m.passengerCount)}
                  </td>
                  <td className={cx(ADMIN_TD_CLASS, "px-2 text-right")}>
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
      <TableSkeleton columns={MOVEMENT_COLUMNS} rows={8} mobileDetails={5} mobileAction />
    </div>
  );
}
