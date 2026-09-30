import type { ReactNode } from "react";
import { IconArrowLeft, IconPlus } from "@/components/icons";
import { Skeleton } from "@/components/skeleton";
import { cx, panelButtonClass } from "@/components/ui-classes";

/**
 * Siluetas de las piezas del panel (spec 6.5) para los `loading.tsx` y los
 * `<Suspense>` de salidas, abordaje, flota y reportes. Reproducen las
 * medidas reales de `panel-ui.tsx`: cabecera, pestañas de 44 px, tarjetas de
 * cifra, tablas en escritorio y tarjetas en móvil. Los textos fijos (títulos
 * de página y de sección, pestañas) se pintan reales, no como barras.
 *
 * Todas las piezas van con `aria-hidden`: dentro de `SkeletonScreen` (región
 * viva) el lector de pantalla solo debe oír la etiqueta de carga, no el título
 * ni las cabeceras de la silueta. Por lo mismo el título es un `<p>` con las
 * clases del `h1`, igual que en los esqueletos de `/mi`.
 */

/**
 * Cabecera de página: volver, título (real o barra), frase y acción opcional.
 * `action` con texto pinta el botón principal real ("Crear salida"), que es
 * un texto fijo; `true` pinta solo una barra.
 */
export function SkeletonPageHeader({
  title,
  description,
  back,
  action = false,
  badge = false,
}: {
  title?: string;
  /** Frase fija conocida; sin ella se pinta una barra. */
  description?: string;
  back?: string;
  action?: boolean | string;
  badge?: boolean;
}) {
  return (
    <div aria-hidden="true" className="flex flex-col gap-3">
      {back ? (
        <span className="-ml-2 inline-flex min-h-11 w-fit items-center gap-1.5 px-2 text-[15px] font-semibold text-marca-700">
          <IconArrowLeft className="size-5 shrink-0" />
          {back}
        </span>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1 max-w-3xl">
          {title ? (
            <p className="text-2xl font-bold tracking-tight text-tinta sm:text-3xl">{title}</p>
          ) : (
            <Skeleton className="h-8 w-2/3 max-w-sm rounded-pastilla sm:h-9" />
          )}
          {description ? (
            <p className="mt-1.5 text-base leading-relaxed text-tinta-suave">{description}</p>
          ) : (
            <Skeleton className="mt-2.5 h-5 w-full max-w-md rounded-pastilla" />
          )}
        </div>
        {typeof action === "string" ? (
          <span className={panelButtonClass("primario")}>
            <IconPlus className="size-5 shrink-0" />
            {action}
          </span>
        ) : action ? (
          <Skeleton className="h-11 w-40" />
        ) : null}
        {badge ? <Skeleton className="h-7 w-28 rounded-pastilla" /> : null}
      </div>
    </div>
  );
}

/** Pestañas del panel con sus etiquetas reales y la activa marcada. */
export function SkeletonTabs({ labels, active = 0 }: { labels: readonly string[]; active?: number }) {
  return (
    <div className="-m-1 overflow-x-hidden p-1" aria-hidden="true">
      <div className="inline-flex min-w-full gap-1 rounded-tarjeta border border-borde bg-superficie p-1 shadow-1">
        {labels.map((label, index) => (
          <span
            key={label}
            className={cx(
              "inline-flex min-h-11 shrink-0 items-center rounded-control px-4 text-[15px] font-semibold",
              index === active ? "bg-marca-50 text-marca-800 ring-1 ring-inset ring-marca-200" : "text-tinta-suave",
            )}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Filtro de periodo de reportes (`PeriodBar`): la etiqueta "Periodo", las
 * pastillas con sus textos reales (la primera como elegida) y el acceso a
 * otras fechas.
 */
export function SkeletonPeriodChips({ labels, extra }: { labels: readonly string[]; extra?: string }) {
  return (
    <div aria-hidden="true" className="flex flex-col gap-2">
      <p className="text-sm font-semibold text-tinta-suave">Periodo</p>
      <div className="flex flex-wrap gap-2">
        {labels.map((label, index) => (
          <span
            key={label}
            className={cx(
              "inline-flex min-h-11 items-center rounded-pastilla border px-4 text-[15px] font-semibold",
              index === 0 ? "border-marca-600 bg-marca-600 text-white" : "border-borde-control bg-superficie text-tinta",
            )}
          >
            {label}
          </span>
        ))}
        {extra ? (
          <span className="inline-flex min-h-11 items-center rounded-pastilla border border-transparent px-4 text-[15px] font-semibold text-marca-700">
            {extra}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/** Fila de tarjetas de cifra (`StatCard`): etiqueta, cifra grande y detalle. */
export function SkeletonStatCards({ count = 3 }: { count?: number }) {
  return (
    <div aria-hidden="true" className={cx("grid grid-cols-1 gap-4", count === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-4")}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex flex-col gap-2 rounded-tarjeta border border-borde bg-superficie p-5 shadow-1">
          <div className="flex items-start justify-between gap-3">
            <Skeleton className="h-4 w-24 rounded-pastilla" />
            <Skeleton className="size-10 rounded-full" />
          </div>
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-4 w-32 rounded-pastilla" />
        </div>
      ))}
    </div>
  );
}

/**
 * Tabla del panel: en escritorio, cabecera y filas; por debajo de `md`, la
 * lista de tarjetas que la reemplaza (`TableShell` con `mobile`).
 */
export function SkeletonTable({
  columns,
  rows = 6,
  cardDetails = 2,
  cardAction = true,
  mobileVariant = "tarjetas",
}: {
  columns: readonly string[];
  rows?: number;
  cardDetails?: number;
  /** Si la tarjeta móvil real lleva un botón al pie. */
  cardAction?: boolean;
  /**
   * `filas`: en el teléfono, filas separadas por líneas (sin tarjeta propia),
   * para listas que ya van dentro de una tarjeta de sección.
   */
  mobileVariant?: "tarjetas" | "filas";
}) {
  return (
    <>
      <div aria-hidden="true" className="hidden overflow-hidden rounded-tarjeta border border-borde bg-superficie shadow-1 md:block">
        <div className="flex gap-4 border-b border-borde bg-lienzo px-4 py-3">
          {columns.map((column) => (
            <span key={column} className="flex-1 text-sm font-semibold text-tinta-suave">
              {column}
            </span>
          ))}
        </div>
        {Array.from({ length: rows }, (_, row) => (
          <div key={row} className="flex items-center gap-4 border-b border-borde px-4 py-4 last:border-0">
            {columns.map((column, col) => (
              <div key={column} className="flex-1">
                <Skeleton className={cx("h-4 rounded-pastilla", col === 0 ? "w-4/5" : "w-2/3")} />
              </div>
            ))}
          </div>
        ))}
      </div>
      {mobileVariant === "filas" ? (
        <div aria-hidden="true" className="flex flex-col divide-y divide-borde md:hidden">
          {Array.from({ length: Math.min(rows, 4) }, (_, row) => (
            <div key={row} className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0">
              <Skeleton className="h-5 w-2/3 rounded-pastilla" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-24 rounded-pastilla" />
                <Skeleton className="h-6 w-28 rounded-pastilla" />
              </div>
              {Array.from({ length: cardDetails }, (_, i) => (
                <Skeleton key={i} className="h-4 w-3/5 rounded-pastilla" />
              ))}
            </div>
          ))}
        </div>
      ) : (
      <div aria-hidden="true" className="flex flex-col gap-3 md:hidden">
        {Array.from({ length: Math.min(rows, 4) }, (_, row) => (
          <div key={row} className="flex flex-col gap-3 rounded-tarjeta border border-borde bg-superficie p-4 shadow-1">
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-1 flex-col gap-1.5">
                <Skeleton className="h-5 w-2/3 rounded-pastilla" />
                <Skeleton className="h-4 w-1/2 rounded-pastilla" />
              </div>
              <Skeleton className="h-6 w-20 rounded-pastilla" />
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {Array.from({ length: cardDetails }, (_, i) => (
                <div key={i} className="flex flex-col gap-1">
                  <Skeleton className="h-3.5 w-16 rounded-pastilla" />
                  <Skeleton className="h-4 w-24 rounded-pastilla" />
                </div>
              ))}
            </div>
            {cardAction ? <Skeleton className="h-11 w-full" /> : null}
          </div>
        ))}
      </div>
      )}
    </>
  );
}

/** Tarjeta de sección (`SectionCard`) con su título real y el cuerpo que se pase. */
export function SkeletonSectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div aria-hidden="true" className="rounded-tarjeta border border-borde bg-superficie shadow-1">
      <div className="flex flex-col gap-1.5 border-b border-borde px-5 py-4">
        <p className="text-lg font-semibold text-tinta">{title}</p>
        <Skeleton className="h-4 w-2/3 max-w-sm rounded-pastilla" />
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

/** Panel lateral mientras carga: la misma caja que `SidePanel`, con el título real y campos en barra. */
export function SkeletonSidePanel({ title, fields = 4 }: { title: string; fields?: number }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Cargando el formulario…</span>
      <div aria-hidden="true" className="absolute inset-0 bg-tinta/40" />
      <div className="relative flex h-full w-full max-w-xl flex-col border-l border-borde bg-superficie shadow-2">
        <div className="flex items-start justify-between gap-4 border-b border-borde px-5 py-4 sm:px-6">
          <p aria-hidden="true" className="pt-1.5 text-xl font-bold leading-snug tracking-tight text-tinta">
            {title}
          </p>
          <Skeleton className="h-11 w-24" />
        </div>
        <div className="flex flex-col gap-5 px-5 py-5 sm:px-6">
          {Array.from({ length: fields }, (_, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <Skeleton className="h-4 w-28 rounded-pastilla" />
              <Skeleton className="h-11 w-full" />
            </div>
          ))}
          <Skeleton className="h-12 w-full sm:w-44" />
        </div>
      </div>
    </div>
  );
}
