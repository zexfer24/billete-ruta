import type { ReactNode } from "react";
import { IconChevronRight } from "@/components/icons";
import { Skeleton } from "@/components/skeleton";
import { cx, panelButtonClass } from "@/components/ui-classes";

/**
 * Siluetas de carga de las pantallas del administrador (spec 6.5). Reproducen
 * las piezas reales con sus alturas y radios: pestañas de 44 px, tarjetas de
 * cifra, tablas en escritorio y tarjetas en móvil. Como en el kit del panel
 * de agencia (`src/app/panel/_shared/skeletons.tsx`), los textos fijos
 * (pestañas, cabeceras de tabla, títulos de sección y etiquetas de cifra) se
 * pintan reales y solo los datos van en barras.
 *
 * Todas las piezas van con `aria-hidden`: dentro de `SkeletonScreen` (región
 * viva) el lector de pantalla solo debe oír la etiqueta de carga.
 */

const CARD = "rounded-tarjeta border border-borde bg-superficie shadow-1";

/**
 * Pestañas de `AdminTabs` con sus etiquetas reales: mismas medidas, el mismo
 * reparto en varias filas en pantallas angostas y la primera como elegida.
 * `counts` pinta el hueco del contador de cada pestaña.
 */
export function TabsSkeleton({
  labels,
  active = 0,
  counts = false,
}: {
  labels: readonly string[];
  active?: number;
  counts?: boolean;
}) {
  return (
    <div aria-hidden="true" className={`${CARD} flex w-full flex-wrap gap-1 p-1`}>
      {labels.map((label, index) => (
        <span
          key={label}
          className={cx(
            "inline-flex min-h-11 grow items-center justify-center gap-2 rounded-control px-4 text-[15px] font-semibold sm:grow-0 sm:justify-start",
            index === active ? "bg-marca-50 text-marca-800 ring-1 ring-inset ring-marca-200" : "text-tinta-suave",
          )}
        >
          {label}
          {counts ? <Skeleton className="h-5 w-7 rounded-pastilla" /> : null}
        </span>
      ))}
    </div>
  );
}

/** Línea de texto secundario de 14 px, como el rango aplicado. */
export function LineSkeleton({ className = "w-72" }: { className?: string }) {
  return <Skeleton className={`h-4 max-w-full rounded-pastilla ${className}`} />;
}

/**
 * Tarjeta de cifra (`StatCard`): la etiqueta real, el círculo del icono, la
 * cifra y el detalle en barras y, si la tarjeta real es un enlace, su
 * "Ver detalle".
 */
export function StatCardSkeleton({ label, link = false }: { label: string; link?: boolean }) {
  return (
    <div aria-hidden="true" className={`${CARD} relative flex flex-col overflow-hidden p-5`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-tinta-suave">{label}</p>
        <Skeleton className="size-10 shrink-0 rounded-full" />
      </div>
      <Skeleton className="mt-1 h-9 w-24" />
      <Skeleton className="mt-2 h-4 w-48 max-w-full rounded-pastilla" />
      {link ? (
        <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-marca-700">
          Ver detalle
          <IconChevronRight className="size-4" />
        </span>
      ) : null}
    </div>
  );
}

/** Formulario de filtros en una tarjeta: campos de 44 px con su etiqueta real y el botón. */
export function FilterCardSkeleton({ labels, button }: { labels: readonly string[]; button: string }) {
  return (
    <div aria-hidden="true" className={`${CARD} flex flex-wrap items-end gap-3 p-4`}>
      {labels.map((label) => (
        <div key={label} className="flex min-w-56 flex-1 flex-col gap-1.5 sm:flex-none">
          <p className="text-sm font-semibold text-tinta">{label}</p>
          <Skeleton className="h-11 w-full sm:w-64" />
        </div>
      ))}
      <span className={panelButtonClass("secundario", "md", "w-full sm:w-auto")}>{button}</span>
    </div>
  );
}

/**
 * Tabla del panel: en escritorio, las cabeceras reales (`columns`; un texto
 * vacío deja la columna sin título, como la de la acción) y filas en barras;
 * en móvil, tarjetas con título, datos y, si la real lo lleva, el botón.
 */
export function TableSkeleton({
  columns,
  rows = 6,
  mobileCards = 3,
  mobileDetails = 4,
  mobileStatus = false,
  mobileAction = false,
}: {
  columns: readonly string[];
  rows?: number;
  mobileCards?: number;
  mobileDetails?: number;
  mobileStatus?: boolean;
  mobileAction?: boolean;
}) {
  return (
    <>
      <div aria-hidden="true" className={`${CARD} hidden overflow-hidden md:block`}>
        <div className="flex gap-4 border-b border-borde px-4 py-3">
          {columns.map((column, index) => (
            <span key={index} className="flex-1 text-sm font-semibold text-tinta-suave">
              {column}
            </span>
          ))}
        </div>
        {Array.from({ length: rows }, (_, row) => (
          <div key={row} className="flex items-center gap-4 border-b border-borde px-4 py-4 last:border-0">
            {columns.map((_, column) => (
              <div key={column} className="flex flex-1 flex-col gap-1.5">
                <Skeleton className={`h-4 rounded-pastilla ${column === 0 ? "w-4/5" : "w-3/5"}`} />
                {column < 2 ? <Skeleton className="h-3.5 w-2/5 rounded-pastilla" /> : null}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div aria-hidden="true" className="flex flex-col gap-3 md:hidden">
        {Array.from({ length: mobileCards }, (_, index) => (
          <div key={index} className={`${CARD} flex flex-col gap-3 p-4`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-1 flex-col gap-1.5">
                <Skeleton className="h-5 w-3/5 rounded-pastilla" />
                <Skeleton className="h-4 w-2/5 rounded-pastilla" />
              </div>
              {mobileStatus ? <Skeleton className="h-6 w-20 rounded-pastilla" /> : null}
            </div>
            {mobileDetails > 0 ? (
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {Array.from({ length: mobileDetails }, (_, detail) => (
                  <div key={detail} className="flex flex-col gap-1">
                    <Skeleton className="h-3.5 w-16 rounded-pastilla" />
                    <Skeleton className="h-4 w-24 rounded-pastilla" />
                  </div>
                ))}
              </div>
            ) : null}
            {mobileAction ? <Skeleton className="h-11 w-full" /> : null}
          </div>
        ))}
      </div>
    </>
  );
}

/**
 * Título de sección (`h2` de 18 px) con su texto real. La frase de ayuda se
 * pinta real si es fija (`description`) y como barra si depende del periodo.
 */
export function SectionHeadingSkeleton({ title, description }: { title: string; description?: ReactNode }) {
  return (
    <div aria-hidden="true" className="flex flex-col gap-1">
      <p className="text-lg font-semibold text-tinta">{title}</p>
      {description ? (
        <p className="text-sm leading-snug text-tinta-suave">{description}</p>
      ) : (
        <Skeleton className="mt-1 h-4 w-2/3 max-w-sm rounded-pastilla" />
      )}
    </div>
  );
}
