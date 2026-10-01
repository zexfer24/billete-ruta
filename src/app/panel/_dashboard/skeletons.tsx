import { Skeleton, SkeletonButton, SkeletonCircle } from "@/components/skeleton";
import { PANEL_TD_CLASS, PANEL_TH_CLASS } from "@/components/panel-ui";
import type { ReactNode } from "react";
import { IconBus, IconCash, IconChevronDown, IconChevronRight, IconTicket } from "@/components/icons";
import { FIGURE_LABELS, FLEET_SECTION, TRIPS_TODAY_SECTION, ticketsSection, type SectionTexts } from "./section-texts";
import { FIGURE_CELL_CLASS, FIGURE_WIDE_CELL_CLASS, FIGURES_GRID_CLASS } from "./figure-classes";
import {
  FLEET_DRIVER_ROW_CLASS,
  FLEET_LIST_CLASS,
  FLEET_MORE_LINK_CLASS,
  MAX_FILAS_MOVIL,
  TICKET_ROW_CLASS,
  TICKETS_LIST_CLASS,
  mobileRowClass,
} from "./list-classes";
import {
  DASHBOARD_SECTION_ACTION_CLASS,
  DASHBOARD_SECTION_HEADER_CLASS,
  DASHBOARD_SECTION_TEXT_CLASS,
} from "./section-card";

/**
 * Siluetas de carga de los bloques del tablero (spec 6.5). Las comparten
 * `loading.tsx` (primera carga) y los `<Suspense>` de cada bloque, para que el
 * paso de una a otra no haga saltar la pantalla: mismas alturas, radios y
 * número de filas que el bloque real. Los textos fijos (títulos, descripciones
 * y botones de sección) se pintan reales; los datos, como barras.
 */

/**
 * Una línea de texto de la silueta con el alto de la línea real: la barra va
 * centrada dentro de un renglón de `lineClass` de alto. `className` agrega
 * clases al renglón (por ejemplo `sm:hidden` para una línea que solo existe en
 * el teléfono, donde el texto real se parte en más renglones).
 */
function LineBar({ lineClass, width, className = "" }: { lineClass: string; width: string; className?: string }) {
  return (
    <span className={`flex items-center ${lineClass} ${className}`}>
      <Skeleton className={`h-4 rounded-pastilla ${width}`} />
    </span>
  );
}

/** Renglón del título de un `Alert` (16 px en negrita, `leading-snug`: 22 px). */
const ALERT_TITLE_LINE = "h-[22px]";
/** Renglón del cuerpo de un `Alert` (16 px, `leading-relaxed`: 26 px). */
const ALERT_BODY_LINE = "h-[26px]";

/**
 * Renglones del único aviso de la silueta, el caso más común: el de
 * comprobantes, cuyo título se parte en dos renglones en el teléfono y su
 * texto en tres (dos desde `sm`). Cada renglón lleva su ancho de barra y, si
 * solo existe en el teléfono, `sm:hidden`.
 */
const ATTENTION_TITLE_LINES: ReadonlyArray<{ width: string; className?: string }> = [
  { width: "w-full sm:w-1/2" },
  { width: "w-1/3", className: "sm:hidden" },
];
const ATTENTION_BODY_LINES: ReadonlyArray<{ width: string; className?: string }> = [
  { width: "w-full" },
  { width: "w-full sm:w-2/3" },
  { width: "w-1/2", className: "sm:hidden" },
];

/**
 * Silueta de "Lo que necesita tu atención": una sola tarjeta con la caja y la
 * geometría de `Alert` (el icono de 24 px, el título y el texto con el alto de
 * sus renglones reales y el botón de 44 px, debajo con la sangría del icono
 * en el teléfono y a la derecha desde `sm`), pero en tono neutro: sin datos
 * no se adelanta una alerta ámbar que luego puede ser el verde de "Todo al
 * día" (spec 6.5: la silueta no inventa bloques ni estados).
 */
export function AttentionSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 rounded-control border border-borde bg-superficie px-4 py-3.5 sm:flex-row sm:items-start">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="shrink-0 pt-px">
            <SkeletonCircle className="size-6" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <div className="flex flex-col">
              {ATTENTION_TITLE_LINES.map((line, i) => (
                <LineBar key={i} lineClass={ALERT_TITLE_LINE} width={line.width} className={line.className} />
              ))}
            </div>
            <div className="flex flex-col">
              {ATTENTION_BODY_LINES.map((line, i) => (
                <LineBar key={i} lineClass={ALERT_BODY_LINE} width={line.width} className={line.className} />
              ))}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 pl-9 sm:pl-0">
          <Skeleton className="h-11 w-44" />
        </div>
      </div>
    </div>
  );
}

/**
 * Silueta de una tarjeta de cifra (`StatCard` con icono y, si enlaza, "Ver
 * detalle"). La etiqueta, el icono y "Ver detalle" son fijos y se pintan
 * reales, como en el kit del terminal; solo la cifra y su frase van en barra.
 */
function StatCardSkeleton({ label, icon, link }: { label: string; icon: ReactNode; link: boolean }) {
  return (
    <div className="relative flex flex-col overflow-hidden rounded-tarjeta border border-borde bg-superficie p-5 shadow-1">
      <span className="absolute inset-x-0 top-0 h-1 bg-borde" />
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-tinta-suave">{label}</p>
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-marca-50 text-marca-600 [&>svg]:size-5">
          {icon}
        </span>
      </div>
      <Skeleton className="mt-1 h-9 w-24 max-w-full" />
      <Skeleton className="mt-2 h-4 w-3/4 rounded-pastilla" />
      {link ? (
        <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-marca-700">
          Ver detalle
          <IconChevronRight className="size-4" />
        </span>
      ) : null}
    </div>
  );
}

/**
 * Las tres cifras en el orden y la rejilla de `FiguresBlock`. Las tres llevan
 * "Ver detalle", como en el periodo "hoy", el que se abre por defecto.
 */
const FIGURE_CARDS: ReadonlyArray<{ label: string; icon: ReactNode; link: boolean; cell: string }> = [
  { label: FIGURE_LABELS.recaudado, icon: <IconCash />, link: true, cell: FIGURE_WIDE_CELL_CLASS },
  { label: FIGURE_LABELS.salidas, icon: <IconBus />, link: true, cell: FIGURE_CELL_CLASS },
  { label: FIGURE_LABELS.tickets, icon: <IconTicket />, link: true, cell: FIGURE_CELL_CLASS },
];

/** Silueta de las tres cifras del periodo. */
export function FiguresSkeleton() {
  return (
    <div aria-hidden="true" className={FIGURES_GRID_CLASS}>
      {FIGURE_CARDS.map((card) => (
        <div key={card.label} className={card.cell}>
          <StatCardSkeleton label={card.label} icon={card.icon} link={card.link} />
        </div>
      ))}
    </div>
  );
}

/**
 * Silueta de la línea en vivo de reservas por cobrar (`PendingNowLine`): en el
 * teléfono la frase de 15 px ocupa tres renglones de 22 px y "Ver por cobrar"
 * (44 px) baja a su propia línea; desde `sm`, la frase y el enlace van en una
 * sola línea de 44 px.
 */
export function PendingNowSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-wrap items-center gap-x-2">
      <div className="flex w-full flex-col sm:hidden">
        <LineBar lineClass="h-[22px]" width="w-full" />
        <LineBar lineClass="h-[22px]" width="w-full" />
        <LineBar lineClass="h-[22px]" width="w-1/2" />
      </div>
      <span className="hidden min-h-11 items-center sm:flex">
        <Skeleton className="h-4 w-96 max-w-full rounded-pastilla" />
      </span>
      <Skeleton className="h-11 w-36" />
    </div>
  );
}

/**
 * Filas de "Actividad reciente" (`ActivityBlock`): la hora en su columna de
 * 96 px, el punto del tono y la frase. "Tickets nuevos" y "Choferes y buses"
 * tienen su propia silueta.
 */
export function ListRowsSkeleton({ rows }: { rows: number }) {
  return (
    <div aria-hidden="true" className="flex flex-col divide-y divide-borde">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
          <span className="flex h-6 w-24 shrink-0 items-center">
            <Skeleton className="h-4 w-12 rounded-pastilla" />
          </span>
          <span className="mt-2 size-2 shrink-0 rounded-full bg-borde" />
          <span className="flex h-6 min-w-0 flex-1 items-center">
            <Skeleton className="h-4 w-3/4 rounded-pastilla" />
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * Cabecera de una tarjeta de sección (`DashboardSection`) en la silueta, con
 * las mismas clases que la real: con los textos de `texts` pinta el título,
 * la descripción y el botón reales (el botón quieto, con el brillo de carga en
 * vez del borde, para que no parezca listo); sin ellos, barras.
 */
function SectionHeaderSkeleton({ texts }: { texts?: Partial<SectionTexts> }) {
  return (
    <div className={DASHBOARD_SECTION_HEADER_CLASS}>
      <div className={DASHBOARD_SECTION_TEXT_CLASS}>
        {texts?.title ? (
          <p className="text-lg font-semibold text-tinta">{texts.title}</p>
        ) : (
          <Skeleton className="h-6 w-48 rounded-pastilla" />
        )}
        {texts?.description ? (
          <p className="mt-1 text-sm leading-snug text-tinta-suave">{texts.description}</p>
        ) : (
          <Skeleton className="mt-1 h-4 w-64 max-w-full rounded-pastilla" />
        )}
      </div>
      <div className={DASHBOARD_SECTION_ACTION_CLASS}>
        {texts?.actionLabel ? (
          <SkeletonButton>{texts.actionLabel}</SkeletonButton>
        ) : (
          <Skeleton className="h-11 w-28" />
        )}
      </div>
    </div>
  );
}

/** Barra de una línea de texto de 14 px: la barra mide 16 px dentro de una línea de 20 px, como el texto real. */
function TextLineBar({ className }: { className: string }) {
  return (
    <span className="flex h-5 items-center">
      <Skeleton className={`h-4 rounded-pastilla ${className}`} />
    </span>
  );
}

/** Textos de la cabecera de "Tickets nuevos": la descripción solo si se conoce el periodo. */
function ticketsSectionTexts(periodPhrase: string | undefined): Partial<SectionTexts> {
  const textos = ticketsSection(periodPhrase ?? "");
  return periodPhrase ? textos : { title: textos.title, actionLabel: textos.actionLabel };
}

/**
 * Silueta de "Tickets nuevos" (`TicketsBlock`): cinco filas (tres en el
 * teléfono, como el bloque real) con la misma
 * geometría que las reales (el código en un renglón de 44 px, el pasajero con
 * la ruta y la hora de emisión) y sin pastilla, que en las reales solo
 * aparece en las ventas de taquilla. Sin `periodPhrase` (el `loading.tsx` no
 * conoce el periodo), la descripción va en barra.
 */
export function TicketsSkeleton({ periodPhrase }: { periodPhrase?: string }) {
  return (
    <div aria-hidden="true" className="rounded-tarjeta border border-borde bg-superficie shadow-1">
      <SectionHeaderSkeleton texts={ticketsSectionTexts(periodPhrase)} />
      <div className="p-5">
        <div className={TICKETS_LIST_CLASS}>
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className={`${TICKET_ROW_CLASS} ${mobileRowClass(i)}`}>
              <span className="flex min-h-11 items-center">
                <Skeleton className="h-5 w-40 rounded-pastilla" />
              </span>
              <TextLineBar className="w-3/4" />
              <TextLineBar className="w-1/3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Silueta de "Choferes y buses" (`FleetBlock`): los subtítulos reales «Buses»
 * y «Choferes», las pastillas del resumen de buses, tres filas de chofer con
 * el nombre y, debajo, la línea del viaje, la línea de los que ya salen en
 * «Salidas de hoy» y el enlace a la flota completa. El bloque real lista solo
 * a los choferes que esa tabla no muestra, así que lo común son pocas filas
 * más esa línea: tres filas son lo que cabe también en el teléfono. Sin
 * pastilla de chofer: la real solo aparece cuando el estado aporta algo.
 */
export function FleetSkeleton() {
  return (
    <div aria-hidden="true" className="rounded-tarjeta border border-borde bg-superficie shadow-1">
      <SectionHeaderSkeleton texts={FLEET_SECTION} />
      <div className="p-5">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <p className="text-base font-semibold text-tinta">Buses</p>
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-7 w-36 rounded-pastilla" />
              <Skeleton className="h-7 w-44 rounded-pastilla" />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-base font-semibold text-tinta">Choferes</p>
            <div className={FLEET_LIST_CLASS}>
              {Array.from({ length: MAX_FILAS_MOVIL }, (_, i) => (
                <div key={i} className={FLEET_DRIVER_ROW_CLASS}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="flex h-6 items-center">
                      <Skeleton className="h-5 w-44 rounded-pastilla" />
                    </span>
                  </div>
                  <TextLineBar className="w-4/5" />
                </div>
              ))}
            </div>
            <TextLineBar className="w-3/4" />
          </div>
          <span className={`${FLEET_MORE_LINK_CLASS} pointer-events-none`}>
            <Skeleton className="h-4 w-36 rounded-pastilla" />
          </span>
        </div>
      </div>
    </div>
  );
}

/** Columnas reales de la tabla de "Salidas de hoy" y el ancho de su barra. */
const TRIPS_COLUMNS = [
  { label: "Hora", width: "w-12" },
  { label: "Ruta, bus y chofer", width: "w-48" },
  { label: "Estado", width: "w-24" },
  { label: "Movimientos", width: "w-16" },
] as const;

/**
 * Silueta de "Salidas de hoy" con la misma forma que el bloque real: por
 * debajo de `xl`, cuatro tarjetas (dos columnas desde `md`) con hora y ruta,
 * pastilla (bajo la ruta en el teléfono), bus y chofer y la flecha (la frase
 * de movimientos solo aparece cuando ya embarcó, y antes es lo común); desde
 * `xl`, la
 * tabla con sus cabeceras reales y cuatro filas de 88 px (el enlace de la
 * ruta de 44 px y la línea del bus), como las reales.
 */
export function TripsTodaySkeleton() {
  return (
    <div aria-hidden="true" className="rounded-tarjeta border border-borde bg-superficie shadow-1">
      <SectionHeaderSkeleton texts={TRIPS_TODAY_SECTION} />
      <div className="p-5">
        <div className="hidden overflow-hidden rounded-tarjeta border border-borde bg-superficie shadow-1 xl:block">
          <table className="w-full text-left">
            <thead className="border-b border-borde">
              <tr>
                {TRIPS_COLUMNS.map((column) => (
                  <th key={column.label} scope="col" className={PANEL_TH_CLASS}>
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 4 }, (_, row) => (
                <tr key={row} className="border-b border-borde last:border-0">
                  {TRIPS_COLUMNS.map((column) => (
                    <td key={column.label} className={PANEL_TD_CLASS}>
                      {column.label === "Ruta, bus y chofer" ? (
                        // El enlace de la ruta (44 px) y la línea del bus y el chofer (20 px).
                        <div className="flex flex-col">
                          <span className="flex min-h-11 items-center">
                            <Skeleton className="h-5 w-48 rounded-pastilla" />
                          </span>
                          <TextLineBar className="w-36" />
                        </div>
                      ) : column.label === "Estado" ? (
                        <Skeleton className="h-7 w-24 rounded-pastilla" />
                      ) : (
                        <Skeleton className={`h-4 rounded-pastilla ${column.width}`} />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:hidden">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-tarjeta border border-borde bg-superficie p-4 shadow-1"
            >
              {/* Como la tarjeta real: en el teléfono la pastilla baja bajo la
                  ruta; luego el bus y el chofer. */}
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex flex-col items-start gap-1 sm:flex-row sm:justify-between sm:gap-2">
                  <span className="flex h-6 w-2/3 items-center">
                    <Skeleton className="h-5 w-full rounded-pastilla" />
                  </span>
                  <Skeleton className="h-7 w-24 rounded-pastilla" />
                </div>
                <TextLineBar className="w-1/2" />
              </div>
              <IconChevronRight className="size-5 shrink-0 text-marca-700" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Silueta de una sección plegable cerrada (`Collapsible`): el título y "Ver"
 * reales, con la misma altura, sin botón que enfocar. La descripción va real
 * si es fija; sin ella (la de "Actividad reciente" depende del periodo, que
 * el `loading.tsx` no conoce), en barra de dos renglones en el teléfono y uno
 * desde `sm`, para no pintar un texto que la página cambia al llegar.
 */
export function CollapsibleSkeleton({ title, description }: { title: string; description?: string }) {
  return (
    <div aria-hidden="true" className="rounded-tarjeta border border-borde bg-superficie shadow-1">
      <div className="flex min-h-16 items-center justify-between gap-4 px-5 py-4">
        <div className="min-w-0">
          <p className="text-lg font-semibold text-tinta">{title}</p>
          {description ? (
            <p className="mt-0.5 text-sm leading-snug text-tinta-suave">{description}</p>
          ) : (
            <span className="mt-0.5 flex flex-col">
              <LineBar lineClass="h-[19px]" width="w-64 max-w-full" />
              <LineBar lineClass="h-[19px]" width="w-32" className="sm:hidden" />
            </span>
          )}
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 text-[15px] font-semibold text-marca-700">
          Ver
          <IconChevronDown className="size-5" />
        </span>
      </div>
    </div>
  );
}
