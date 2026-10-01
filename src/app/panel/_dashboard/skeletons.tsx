import { Skeleton, SkeletonCircle } from "@/components/skeleton";
import { PANEL_TH_CLASS, panelButtonClass } from "@/components/panel-ui";
import type { ReactNode } from "react";
import { IconBus, IconCash, IconChevronDown, IconChevronRight, IconClock, IconTicket } from "@/components/icons";
import { FIGURE_LABELS, TRIPS_TODAY_SECTION, type SectionTexts } from "./section-texts";
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

/** Fondo y borde de cada aviso de la silueta: el primero alerta, el segundo información. */
const ATTENTION_TONES = ["border-alerta/30 bg-alerta-suave", "border-info/30 bg-info-suave"] as const;

/** Silueta de "Lo que necesita tu atención": dos avisos con su botón, con sus fondos suaves reales. */
export function AttentionSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-3">
      {ATTENTION_TONES.map((tone) => (
        <div
          key={tone}
          className={`flex flex-col gap-3 rounded-control border px-4 py-3.5 sm:flex-row sm:items-center ${tone}`}
        >
          <div className="flex flex-1 items-start gap-3">
            <SkeletonCircle className="size-6" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-5 w-2/3 rounded-pastilla" />
              <Skeleton className="h-4 w-1/2 rounded-pastilla" />
            </div>
          </div>
          <Skeleton className="ml-9 h-11 w-44 sm:ml-0" />
        </div>
      ))}
    </div>
  );
}

/**
 * Silueta de una tarjeta de cifra (`StatCard` con icono y "Ver detalle"). La
 * etiqueta, el icono y "Ver detalle" son fijos y se pintan reales, como en el
 * kit del terminal; solo la cifra y su frase van en barra.
 */
function StatCardSkeleton({ label, icon }: { label: string; icon: ReactNode }) {
  return (
    <div className="relative flex flex-col overflow-hidden rounded-tarjeta border border-borde bg-superficie p-5 shadow-1">
      <span className="absolute inset-x-0 top-0 h-1 bg-borde" />
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-tinta-suave">{label}</p>
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-marca-50 text-marca-600 [&>svg]:size-5">
          {icon}
        </span>
      </div>
      <Skeleton className="mt-1 h-9 w-24" />
      <Skeleton className="mt-2 h-4 w-3/4 rounded-pastilla" />
      <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-marca-700">
        Ver detalle
        <IconChevronRight className="size-4" />
      </span>
    </div>
  );
}

/** Las cuatro cifras en el orden de `FiguresBlock`, con su icono. */
const FIGURE_CARDS: ReadonlyArray<{ label: string; icon: ReactNode }> = [
  { label: FIGURE_LABELS.porCobrar, icon: <IconClock /> },
  { label: FIGURE_LABELS.salidas, icon: <IconBus /> },
  { label: FIGURE_LABELS.recaudado, icon: <IconCash /> },
  { label: FIGURE_LABELS.tickets, icon: <IconTicket /> },
];

/** Silueta de las cuatro cifras del periodo. */
export function FiguresSkeleton() {
  return (
    <div aria-hidden="true" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {FIGURE_CARDS.map((card) => (
        <StatCardSkeleton key={card.label} label={card.label} icon={card.icon} />
      ))}
    </div>
  );
}

/** Filas de una lista dentro de una tarjeta de sección: título, detalle y pastilla. */
export function ListRowsSkeleton({ rows }: { rows: number }) {
  return (
    <div aria-hidden="true" className="flex flex-col divide-y divide-borde">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-5 w-1/2 rounded-pastilla" />
            <Skeleton className="h-4 w-3/4 rounded-pastilla" />
          </div>
          <Skeleton className="h-6 w-24 rounded-pastilla" />
        </div>
      ))}
    </div>
  );
}

/**
 * Cabecera de una tarjeta de sección (`DashboardSection`) en la silueta, con
 * las mismas clases que la real: con los textos de `texts` pinta el título,
 * la descripción y el botón reales (el botón como `span`, sin foco); sin
 * ellos, barras.
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
          <span className={panelButtonClass("secundario")}>{texts.actionLabel}</span>
        ) : (
          <Skeleton className="h-11 w-28" />
        )}
      </div>
    </div>
  );
}

/**
 * Silueta de una tarjeta de sección (`SectionCard`): cabecera con título,
 * descripción y botón (reales si se pasan) y el cuerpo con `rows` filas.
 */
export function SectionSkeleton({
  rows = 4,
  title,
  description,
  actionLabel,
}: {
  rows?: number;
  title?: string;
  description?: string;
  actionLabel?: string;
}) {
  return (
    <div aria-hidden="true" className="rounded-tarjeta border border-borde bg-superficie shadow-1">
      <SectionHeaderSkeleton texts={{ title, description, actionLabel }} />
      <div className="p-5">
        <ListRowsSkeleton rows={rows} />
      </div>
    </div>
  );
}

/** Columnas reales de la tabla de "Salidas de hoy" y el ancho de su barra. */
const TRIPS_COLUMNS = [
  { label: "Hora", width: "w-12" },
  { label: "Ruta, bus y chofer", width: "w-48" },
  { label: "Estado", width: "w-24" },
  { label: "Movimientos", width: "w-40" },
] as const;

/**
 * Silueta de "Salidas de hoy" con la misma forma que el bloque real: por
 * debajo de `xl`, cuatro tarjetas (dos columnas desde `md`) con hora y ruta,
 * pastilla, bus y chofer, la frase de movimientos y la flecha; desde `xl`, la
 * tabla con sus cabeceras reales y seis filas.
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
              {Array.from({ length: 6 }, (_, row) => (
                <tr key={row} className="border-b border-borde last:border-0">
                  {TRIPS_COLUMNS.map((column) => (
                    <td key={column.label} className="px-4 py-3 align-middle">
                      {column.label === "Ruta, bus y chofer" ? (
                        <div className="flex flex-col gap-2 py-1">
                          <Skeleton className="h-5 w-48 rounded-pastilla" />
                          <Skeleton className="h-4 w-36 rounded-pastilla" />
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
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <Skeleton className="h-5 w-2/3 rounded-pastilla" />
                  <Skeleton className="h-7 w-24 rounded-pastilla" />
                </div>
                <Skeleton className="h-4 w-1/2 rounded-pastilla" />
                <Skeleton className="h-4 w-2/5 rounded-pastilla" />
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
 * Silueta de una sección plegable cerrada (`Collapsible`): el título, la
 * descripción y "Ver" reales, con la misma altura, sin botón que enfocar.
 */
export function CollapsibleSkeleton({ title, description }: { title: string; description: string }) {
  return (
    <div aria-hidden="true" className="rounded-tarjeta border border-borde bg-superficie shadow-1">
      <div className="flex min-h-16 items-center justify-between gap-4 px-5 py-4">
        <div className="min-w-0">
          <p className="text-lg font-semibold text-tinta">{title}</p>
          <p className="mt-0.5 text-sm leading-snug text-tinta-suave">{description}</p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 text-[15px] font-semibold text-marca-700">
          Ver
          <IconChevronDown className="size-5" />
        </span>
      </div>
    </div>
  );
}
