import type { ReactNode } from "react";
import Link from "next/link";
import { IconBus, IconChevronRight, IconRoute, IconUsers } from "@/components/icons";
import {
  EmptyState,
  MobileCard,
  PANEL_TD_CLASS,
  PANEL_TH_CLASS,
  StatCard,
  TableShell,
  panelButtonClass,
} from "@/components/panel-ui";
import { Skeleton } from "@/components/skeleton";
import { cx } from "@/components/ui-classes";
import { formatCaracasDate, formatCaracasDateTime24, formatCaracasTime24 } from "@/lib/time";
import { departureTaxByHour, listNewAccounts, listTerminalTrips } from "@/modules/reports";
import { countLabel, formatCount } from "../_shared/format";
import {
  AuditNote,
  DISCLOSURE_SUMMARY_CLASS,
  DisclosureChevron,
  MobileCardList,
  SECTION_LINK_CLASS,
  TimeCell,
} from "../_shared/lists";
import {
  describeAdminRange,
  periodQuery,
  spansSeveralDays,
  withQuery,
  type AdminRange,
} from "../_shared/period";
import { SectionHeadingSkeleton, StatCardSkeleton, TableSkeleton } from "../_shared/skeletons";
import {
  CHART_CAPTION,
  CHART_DETAIL_LABEL,
  HOUR_LABEL_CELL_CLASS,
  TaxByHourChart,
  chartDescription,
} from "./tax-by-hour-chart";

/** Cuántas filas trae cada lista del tablero. Las cifras usan el total real. */
const LIST_LIMIT = 100;

/** Con más filas que estas, la tabla de escritorio se desplaza dentro de su marco. */
const SCROLL_AFTER_ROWS = 10;

const TABLERO_PATH = "/panel/admin/tablero";

/** Enlace a otro periodo del tablero, para salir de un estado vacío. */
function widerPeriodHref(range: AdminRange): { href: string; label: string } | null {
  if (range.period === "30d") return null;
  if (range.period === "7d") return { href: withQuery(TABLERO_PATH, { periodo: "30d" }), label: "Ver los últimos 30 días" };
  return { href: withQuery(TABLERO_PATH, { periodo: "7d" }), label: "Ver los últimos 7 días" };
}

function ScrollArea({ label, long, children }: { label: string; long: boolean; children: ReactNode }) {
  if (!long) return <>{children}</>;
  return (
    // Región desplazable enfocable, para que también se recorra con el teclado.
    <div role="region" aria-label={label} tabIndex={0} className="foco max-h-[30rem] overflow-y-auto">
      {children}
    </div>
  );
}

/** Tarjetas del móvil que se ven antes de "Ver N más": el tablero es un resumen. */
const MOBILE_INITIAL = 5;

/** Cabeceras de las dos tablas, compartidas con su silueta de carga. */
const TRIP_COLUMNS = ["Salió", "Ruta", "Agencia"] as const;
const NEW_ACCOUNT_COLUMNS = ["Registro", "Cédula", "Primer nombre", "Primer apellido"] as const;

/** Títulos y frases fijas de las secciones, compartidos con su silueta de carga. */
const TRIPS_TITLE = "Últimos viajes completados";
const TRIPS_DESCRIPTION =
  "Viajes que ya llegaron a su destino, con su ruta y su punto de encuentro. Primero el que salió más recientemente.";
const MOVEMENTS_LINK_LABEL = "Ver todos los movimientos";
const AUDIT_TEXT = "Esta lista muestra datos personales: cada vez que se abre queda registrada con tu nombre.";
const NEW_ACCOUNTS_TITLE = "Usuarios nuevos";
const NEW_ACCOUNTS_DESCRIPTION =
  "Pasajeros que crearon su cuenta, o a quienes se la crearon en taquilla, en este periodo.";
const CHART_TITLE = "Tasa cobrada por hora del día";

/**
 * Título de la sección del periodo, con las pestañas a su derecha, como
 * "Resumen de hoy" en el tablero de la agencia. Fijo, para que la silueta de
 * carga lo pinte real aunque no conozca `?periodo=`.
 */
export const PERIOD_TITLE = { text: "Resumen del periodo", id: "periodo-titulo" } as const;

/** Cabecera de columna que queda fija arriba cuando la lista se desplaza. */
const STICKY_TH = cx(PANEL_TH_CLASS, "sticky top-0 z-10 bg-superficie shadow-1");

/**
 * Cifras, listas y gráfico del periodo elegido en el tablero. Va dentro de un
 * `<Suspense>` con la clave del periodo, así el cambio de pestaña muestra su
 * silueta enseguida. Todo lo de aquí cambia con el periodo; los usuarios
 * recurrentes, que no, van arriba. `listNewAccounts` deja registro de
 * auditoría, como antes.
 */
export async function PeriodData({ range, panelUserId }: { range: AdminRange; panelUserId: string }) {
  const [trips, newAccounts, byHour] = await Promise.all([
    listTerminalTrips(range.from, range.to, { limit: LIST_LIMIT }),
    listNewAccounts(range.from, range.to, panelUserId, { limit: LIST_LIMIT }),
    departureTaxByHour(range.from, range.to),
  ]);

  const rangeText = describeAdminRange(range);
  const wider = widerPeriodHref(range);
  const movementsHref = withQuery("/panel/admin/movimientos", periodQuery(range));

  return (
    <div className="flex flex-col gap-6">
      {/* Sin enlace en la cifra: "Ver todos los movimientos" ya está en la
          cabecera de la sección de abajo, con el mismo destino. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          label="Recorridos completados"
          value={formatCount(trips.total)}
          detail="Viajes que llegaron a su destino."
          icon={<IconBus />}
          tone="neutro"
        />
        <StatCard
          label="Usuarios nuevos"
          value={formatCount(newAccounts.total)}
          detail="Cuentas de pasajero creadas."
          icon={<IconUsers />}
          tone="neutro"
        />
      </div>

      <section aria-labelledby="recorridos-titulo" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
          <div className="min-w-0">
            <h2 id="recorridos-titulo" className="text-lg font-semibold text-tinta">
              {TRIPS_TITLE}
            </h2>
            <p className="text-sm leading-snug text-tinta-suave">{TRIPS_DESCRIPTION}</p>
          </div>
          {trips.total > 0 ? (
            <Link href={movementsHref} className={SECTION_LINK_CLASS}>
              {MOVEMENTS_LINK_LABEL}
              <IconChevronRight className="size-4 shrink-0" />
            </Link>
          ) : null}
        </div>

        {trips.rows.length === 0 ? (
          <EmptyState
            icon={<IconRoute />}
            title="No hay recorridos completados en este periodo"
            description="Un recorrido cuenta cuando la agencia registra la llegada del bus a su destino."
            action={
              wider ? (
                <Link href={wider.href} className={panelButtonClass("secundario")}>
                  {wider.label}
                </Link>
              ) : undefined
            }
          />
        ) : (
          <TableShell
            mobile={
              <MobileCardList
                label={TRIPS_TITLE}
                initial={MOBILE_INITIAL}
                moreNoun={["recorrido", "recorridos"]}
                items={trips.rows.map((t) => (
                  <MobileCard
                    key={t.tripLogId}
                    title={`${t.origin} → ${t.destination}`}
                    subtitle={t.agencyName}
                    details={[
                      {
                        label: "Salió",
                        value: t.departedAt ? formatCaracasDateTime24(t.departedAt) : "Sin registrar",
                      },
                      { label: "Punto de encuentro", value: t.meetingPoint },
                    ]}
                  />
                ))}
              />
            }
          >
            <ScrollArea label="Lista de viajes completados" long={trips.rows.length > SCROLL_AFTER_ROWS}>
              <table className="w-full text-left">
                <caption className="sr-only">
                  {TRIPS_TITLE}. {rangeText}.
                </caption>
                <thead>
                  <tr>
                    {TRIP_COLUMNS.map((column) => (
                      <th key={column} scope="col" className={STICKY_TH}>
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {trips.rows.map((t) => (
                    <tr key={t.tripLogId} className="border-t border-borde">
                      <td className={PANEL_TD_CLASS}>
                        <TimeCell
                          time={t.departedAt ? formatCaracasTime24(t.departedAt) : undefined}
                          date={t.departedAt ? formatCaracasDate(t.departedAt) : undefined}
                        />
                      </td>
                      <td className={PANEL_TD_CLASS}>
                        <span className="block font-semibold">
                          {t.origin} → {t.destination}
                        </span>
                        <span className="block text-sm text-tinta-suave">{t.meetingPoint}</span>
                      </td>
                      <td className={PANEL_TD_CLASS}>{t.agencyName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>
          </TableShell>
        )}
        {trips.total > trips.rows.length ? (
          <p className="text-sm text-tinta-suave">
            Se muestran los {formatCount(trips.rows.length)} más recientes de {countLabel(trips.total, "recorrido", "recorridos")}.
          </p>
        ) : null}
      </section>

      <section aria-labelledby="usuarios-nuevos-titulo" className="flex flex-col gap-3">
        <div className="min-w-0">
          <h2 id="usuarios-nuevos-titulo" className="text-lg font-semibold text-tinta">
            {NEW_ACCOUNTS_TITLE}
          </h2>
          <p className="text-sm leading-snug text-tinta-suave">{NEW_ACCOUNTS_DESCRIPTION}</p>
        </div>

        {newAccounts.rows.length === 0 ? (
          <EmptyState
            icon={<IconUsers />}
            title="Nadie creó una cuenta en este periodo"
            description="Las cuentas nuevas aparecen aquí apenas el pasajero se registra o lo registran en la taquilla."
            action={
              wider ? (
                <Link href={wider.href} className={panelButtonClass("secundario")}>
                  {wider.label}
                </Link>
              ) : undefined
            }
          />
        ) : (
          <TableShell
            mobile={
              <MobileCardList
                label={NEW_ACCOUNTS_TITLE}
                initial={MOBILE_INITIAL}
                moreNoun={["usuario", "usuarios"]}
                items={newAccounts.rows.map((a) => (
                  <MobileCard
                    key={a.id}
                    title={`${a.firstName} ${a.firstSurname}`}
                    subtitle={`Cédula ${a.idNumber}`}
                    details={[{ label: "Registro", value: formatCaracasDateTime24(a.createdAt) }]}
                  />
                ))}
              />
            }
          >
            <ScrollArea label="Lista de usuarios nuevos" long={newAccounts.rows.length > SCROLL_AFTER_ROWS}>
              <table className="w-full text-left">
                <caption className="sr-only">
                  {NEW_ACCOUNTS_TITLE}. {rangeText}.
                </caption>
                <thead>
                  <tr>
                    {NEW_ACCOUNT_COLUMNS.map((column) => (
                      <th key={column} scope="col" className={STICKY_TH}>
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {newAccounts.rows.map((a) => (
                    <tr key={a.id} className="border-t border-borde">
                      <td className={PANEL_TD_CLASS}>
                        <TimeCell time={formatCaracasTime24(a.createdAt)} date={formatCaracasDate(a.createdAt)} />
                      </td>
                      <td className={cx(PANEL_TD_CLASS, "tabular font-semibold")}>{a.idNumber}</td>
                      <td className={PANEL_TD_CLASS}>{a.firstName}</td>
                      <td className={PANEL_TD_CLASS}>{a.firstSurname}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>
          </TableShell>
        )}
        {newAccounts.total > newAccounts.rows.length ? (
          <p className="text-sm text-tinta-suave">
            Se muestran los {formatCount(newAccounts.rows.length)} más recientes de{" "}
            {countLabel(newAccounts.total, "usuario nuevo", "usuarios nuevos")}.
          </p>
        ) : null}
        <AuditNote>{AUDIT_TEXT}</AuditNote>
      </section>

      <TaxByHourChart title={CHART_TITLE} hours={byHour} severalDays={range.period !== "24h" && spansSeveralDays(range)} />
    </div>
  );
}

/**
 * Silueta de `PeriodData`: dos cifras, dos listas y el gráfico. Los títulos,
 * las frases fijas, el enlace a movimientos, la nota de privacidad y los
 * textos fijos del gráfico se pintan reales; el cuerpo del gráfico reserva su
 * altura real (frase de resumen, 176 px de barras, fila de horas, leyenda y
 * desplegable).
 */
export function PeriodDataSkeleton({ severalDays = false }: { severalDays?: boolean }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCardSkeleton label="Recorridos completados" icon={<IconBus />} />
        <StatCardSkeleton label="Usuarios nuevos" icon={<IconUsers />} />
      </div>
      <div className="flex flex-col gap-3">
        <SectionHeadingSkeleton
          title={TRIPS_TITLE}
          description={TRIPS_DESCRIPTION}
          action={
            <span className={SECTION_LINK_CLASS}>
              {MOVEMENTS_LINK_LABEL}
              <IconChevronRight className="size-4 shrink-0" />
            </span>
          }
        />
        <TableSkeleton columns={TRIP_COLUMNS} rows={5} mobileDetails={2} />
      </div>
      <div className="flex flex-col gap-3">
        <SectionHeadingSkeleton title={NEW_ACCOUNTS_TITLE} description={NEW_ACCOUNTS_DESCRIPTION} />
        <TableSkeleton columns={NEW_ACCOUNT_COLUMNS} rows={4} mobileCards={2} mobileDetails={1} />
        <div aria-hidden="true">
          <AuditNote>{AUDIT_TEXT}</AuditNote>
        </div>
      </div>
      <div aria-hidden="true" className="rounded-tarjeta border border-borde bg-superficie shadow-1">
        <div className="border-b border-borde px-5 py-4">
          <p className="text-lg font-semibold text-tinta">{CHART_TITLE}</p>
          <p className="mt-1 text-sm leading-snug text-tinta-suave">{chartDescription(severalDays)}</p>
        </div>
        <div className="flex flex-col gap-5 p-5">
          <Skeleton className="h-6 w-full max-w-lg rounded-pastilla" />
          <div className="flex flex-col gap-2">
            <div className="flex gap-2 sm:gap-3">
              <div className="flex h-44 w-14 shrink-0 flex-col justify-between">
                <Skeleton className="h-4 w-full rounded-pastilla" />
                <Skeleton className="h-4 w-full rounded-pastilla" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex h-44 items-end gap-px border-b border-borde-control sm:gap-1">
                  {Array.from({ length: 24 }, (_, index) => (
                    <Skeleton
                      key={index}
                      className={`min-w-0 flex-1 rounded-b-none ${["h-1/4", "h-1/2", "h-2/3", "h-1/3", "h-3/4"][index % 5]}`}
                    />
                  ))}
                </div>
                {/* La fila de horas es fija (00 a 23): se pinta real, con las
                    mismas clases y el mismo rotulado cada tres horas en el teléfono. */}
                <div className="mt-1.5 flex gap-px sm:gap-1">
                  {Array.from({ length: 24 }, (_, index) => (
                    <span key={index} className={cx(HOUR_LABEL_CELL_CLASS, index % 3 !== 0 && "max-md:invisible")}>
                      <span className="whitespace-nowrap">{String(index).padStart(2, "0")}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <p className="text-sm text-tinta-suave">{CHART_CAPTION}</p>
          </div>
          <span className={DISCLOSURE_SUMMARY_CLASS}>
            {CHART_DETAIL_LABEL}
            <DisclosureChevron />
          </span>
        </div>
      </div>
    </div>
  );
}
