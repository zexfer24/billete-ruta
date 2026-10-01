import Link from "next/link";
import { ClickableRow } from "@/components/clickable-row";
import { IconChevronRight, IconDownload, IconRoute } from "@/components/icons";
import { EmptyState, StatusBadge, TableShell, panelButtonClass } from "@/components/panel-ui";
import { cx } from "@/components/ui-classes";
import { departureStatusLabel, departureStatusTone } from "@/lib/labels";
import { formatCaracasDate, formatCaracasTime24, formatDuration } from "@/lib/time";
import { agencyMovements } from "@/modules/reports";
import { countLabel, formatCount } from "../_shared/format";
import { ADMIN_TD_CLASS, ADMIN_TH_CLASS, DotParts, MobileCardList, TimeCell } from "../_shared/lists";
import { describeAdminRange, withQuery, type AdminRange } from "../_shared/period";
import { ButtonSkeleton, LineSkeleton, TableSkeleton, skeletonColumns } from "../_shared/skeletons";
import { arrivesAnotherDay, tripHoursParts } from "../_shared/trip-hours";
import { MOVEMENTS_PATH, hourFrom, movementsCsvHref, movementsHref, tripStatus } from "./movements";

/** Tope de filas de `agencyMovements`; si se alcanza, se avisa. */
const MOVEMENTS_LIMIT = 300;

/** Texto de la descarga, compartido con la silueta (glosario de la spec: "Descargar en Excel (CSV)"). */
const DOWNLOAD_LABEL = "Descargar en Excel (CSV)";

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

type Movement = Awaited<ReturnType<typeof agencyMovements>>[number];

/**
 * Tarjeta de un viaje en el teléfono: agencia, ruta, estado, las horas en una
 * línea (`tripHoursParts`, la misma del tablero) y la fecha (si no va ya junto
 * a las horas) con los pasajeros. Toda la tarjeta es el enlace al detalle,
 * como la fila de la tabla (sin un botón repetido en cada tarjeta); el
 * embarque y la duración están en el panel de detalle.
 */
function MovementCard({ movement: m, href }: { movement: Movement; href: string }) {
  const status = tripStatus(m);
  const reference = m.departedAt ?? m.boardingStartedAt;
  const hours = tripHoursParts(m.departedAt, m.arrivedAt, m.boardingStartedAt);
  const anotherDay = arrivesAnotherDay(m.departedAt, m.arrivedAt);
  return (
    <li>
      <Link
        href={href}
        scroll={false}
        className="foco flex items-center gap-3 rounded-tarjeta border border-borde bg-superficie p-4 shadow-1 transition-colors duration-150 ease-out hover:border-marca-600 motion-reduce:transition-none"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-2">
          <span className="flex items-start justify-between gap-3">
            <span className="min-w-0 flex-1">
              <span className="sr-only">{DETAIL_LABEL}: </span>
              <span className="block break-words text-base font-semibold text-tinta">{m.agencyName}</span>
              <span className="block text-sm text-tinta-suave">
                {m.origin} → {m.destination}
              </span>
            </span>
            {status === "FINALIZADA" ? null : (
              <span className="max-w-[55%] shrink-0">
                <StatusBadge label={departureStatusLabel(status)} tone={departureStatusTone(status)} />
              </span>
            )}
          </span>
          <span className="flex flex-col text-[15px]">
            {hours.length > 0 ? (
              <span className="tabular font-medium text-tinta">
                <DotParts parts={hours} />
              </span>
            ) : null}
            <span className="tabular text-sm text-tinta-suave">
              <DotParts
                parts={[
                  ...(reference && !anotherDay ? [formatCaracasDate(reference)] : []),
                  countLabel(m.passengerCount, "pasajero", "pasajeros"),
                ]}
              />
            </span>
          </span>
        </span>
        <IconChevronRight className="size-5 shrink-0 text-marca-700" />
      </Link>
    </li>
  );
}

/**
 * Lista de movimientos del periodo y la agencia elegidos: tabla en escritorio
 * y tarjetas en móvil. Cada viaje abre su detalle en el panel lateral. Un
 * viaje sin salida o sin llegada muestra su estado ("Embarcando", "En ruta")
 * en vez de una raya; uno que ya llegó no lo repite. En la tabla, cada hora
 * va como en `TimeCell` (la hora y debajo la fecha, que solo se repite en la
 * llegada o el embarque si caen otro día); en las tarjetas, solo lo esencial
 * (`MovementCard`).
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
      {/* La descarga va junto al total: baja justo estos viajes (el periodo y
          la agencia elegidos), no todos. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p id="movimientos-total" className="text-sm font-semibold text-tinta-suave">
          {countLabel(movements.length, "viaje", "viajes")}
          {agencyName ? ` de ${agencyName}` : " de todas las agencias"}.
        </p>
        <a
          href={movementsCsvHref(range, agencyId)}
          download
          aria-describedby="movimientos-total"
          className={panelButtonClass("secundario")}
        >
          <IconDownload className="size-5 shrink-0" />
          {DOWNLOAD_LABEL}
        </a>
      </div>

      <TableShell
        mobile={
          <MobileCardList
            label="Movimientos"
            moreNoun={["viaje", "viajes"]}
            items={movements.map((m) => (
              <MovementCard key={m.tripLogId} movement={m} href={movementsHref(range, agencyId, m.tripLogId)} />
            ))}
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
                      className={panelButtonClass("fantasma", "md")}
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

/**
 * Silueta de cada columna de la tabla: cuántas líneas lleva la celda real y de
 * qué ancho aproximado, para que la tabla de carga reparta las columnas igual
 * que la real. La última es la flecha del detalle.
 */
const MOVEMENT_SKELETON_COLUMNS = skeletonColumns(MOVEMENT_COLUMNS, [
  { lines: ["w-36", "w-44"] },
  { lines: ["w-32", "w-16"] },
  { lines: ["w-12", "w-20"] },
  { lines: ["w-12", "w-24"] },
  { lines: ["w-6"], align: "right" },
  { kind: "chevron" },
]);

/** Silueta de la lista de movimientos: el total y la tabla con sus cabeceras reales. */
export function MovementsListSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div aria-hidden="true" className="flex flex-wrap items-center justify-between gap-3">
        <LineSkeleton className="w-60" />
        <ButtonSkeleton>
          <IconDownload className="size-5 shrink-0" />
          {DOWNLOAD_LABEL}
        </ButtonSkeleton>
      </div>
      <TableSkeleton
        columns={MOVEMENT_SKELETON_COLUMNS}
        rows={8}
        mobileDetails={0}
        mobileSubtitleLines={3}
        mobileChevron
      />
    </div>
  );
}
