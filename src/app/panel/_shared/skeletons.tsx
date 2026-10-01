import type { ReactNode } from "react";
import { IconArrowLeft, IconCalendar, IconChevronDown, IconPlus } from "@/components/icons";
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
        {/* Sin `flex-1`, como `PanelPageHeader`: una frase larga ocupa la línea
            y la acción o la pastilla bajan, igual que en la página real. Con la
            frase en barra (sin texto que le dé ancho) se usa `w-full`, para que
            las barras no se encojan a cero. */}
        <div className={cx("min-w-0 max-w-3xl", description ? undefined : "w-full")}>
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
        {action || badge ? (
          <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2 sm:shrink-0">
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
        ) : null}
      </div>
    </div>
  );
}

/**
 * Pestañas del panel con sus etiquetas reales y las mismas clases que
 * `PanelTabs`: en el teléfono se reparten el ancho y bajan de fila si no
 * caben, así la silueta no salta al llegar la página. Por defecto ninguna va
 * marcada (`active = -1`): un `loading.tsx` no sabe si se entró con
 * `?ver=historial` o `?vista=choferes`, y marcar la primera mostraría un
 * instante la equivocada. Dentro de un `<Suspense>` que ya conoce la vista sí
 * se pasa `active`.
 */
export function SkeletonTabs({
  labels,
  active = -1,
  counts = false,
}: {
  labels: readonly string[];
  active?: number;
  /** Si las pestañas reales llevan contador (`count` de `PanelTabs`): se pinta su pastilla en barra. */
  counts?: boolean;
}) {
  return (
    <div aria-hidden="true" className="flex w-full flex-wrap gap-1 rounded-tarjeta border border-borde bg-superficie p-1 shadow-1">
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

/**
 * Filtro de periodo de reportes (`PeriodBar`): la etiqueta "Periodo", las
 * pastillas con sus textos reales y el acceso a otras fechas, con la misma
 * rejilla que la real (dos por fila en el teléfono). Como en las pestañas,
 * por defecto ninguna va elegida: el `loading.tsx` no conoce `?periodo=`.
 */
export function SkeletonPeriodChips({
  labels,
  extra,
  active = -1,
}: {
  labels: readonly string[];
  extra?: string;
  active?: number;
}) {
  return (
    <div aria-hidden="true" className="flex flex-col gap-2">
      <p className="text-sm font-semibold text-tinta-suave">Periodo</p>
      <div className="flex flex-wrap items-start gap-2">
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap">
          {labels.map((label, index) => (
            <span
              key={label}
              className={cx(
                "inline-flex min-h-11 items-center justify-center rounded-pastilla border px-4 text-[15px] font-semibold sm:justify-start",
                index === active ? "border-marca-600 bg-marca-600 text-white" : "border-borde-control bg-superficie text-tinta",
              )}
            >
              {label}
            </span>
          ))}
        </div>
        {extra ? (
          <span className="inline-flex min-h-11 items-center gap-2 rounded-pastilla border border-transparent px-4 text-[15px] font-semibold text-marca-700">
            <IconCalendar className="size-5 shrink-0" />
            {extra}
            <IconChevronDown className="size-5 shrink-0" />
          </span>
        ) : null}
      </div>
    </div>
  );
}

/** Una cifra conocida de antemano: su etiqueta y su icono son fijos, solo la cifra y el detalle cargan. */
export interface SkeletonStat {
  label: string;
  icon?: ReactNode;
  /** Si en la versión compacta del teléfono la cifra lleva un detalle corto debajo ("de 20"). */
  compactDetail?: boolean;
  /** Etiqueta más corta que usa la versión compacta ("Pasajeros" en vez de "Pasajeros transportados"). */
  compactLabel?: string;
  /** En la versión compacta, la cifra ocupa su propia fila (`wide` de `CompactFigures`). */
  compactWide?: boolean;
}

/** Columnas de la versión compacta, igual que `CompactFigures`. */
const COMPACT_COLUMNS: Record<number, string> = { 1: "grid-cols-1", 2: "grid-cols-2", 3: "grid-cols-3" };

/**
 * Fila de tarjetas de cifra (`StatCard`): la franja superior neutra de 4 px,
 * la etiqueta y el icono reales si se conocen (`stats`), la cifra grande y el
 * detalle en barra. Con `compact` reproduce `CompactFigures`: por debajo de
 * `sm`, una sola tarjeta con las cifras en columnas (y las `compactWide` en
 * su propia fila) en vez de tarjetas apiladas.
 */
export function SkeletonStatCards({
  count = 3,
  stats,
  compact = false,
}: {
  count?: number;
  stats?: readonly SkeletonStat[];
  compact?: boolean;
}) {
  const total = stats?.length ?? count;
  const enFila = Math.min(3, Math.max(1, total - (stats?.filter((stat) => stat.compactWide).length ?? 0)));
  return (
    <>
      {compact ? (
        <div
          aria-hidden="true"
          className={cx(
            "grid gap-px overflow-hidden rounded-tarjeta border border-borde bg-borde shadow-1 sm:hidden",
            COMPACT_COLUMNS[enFila],
          )}
        >
          {Array.from({ length: total }, (_, i) => (
            <div
              key={i}
              className={cx(
                "flex flex-col items-center gap-1 bg-superficie px-2 py-3 text-center",
                stats?.[i]?.compactWide && "col-span-full",
              )}
            >
              <Skeleton className="h-8 w-10" />
              {stats?.[i] ? (
                <p className="text-sm font-semibold leading-snug text-tinta-suave">{stats[i].compactLabel ?? stats[i].label}</p>
              ) : (
                <Skeleton className="h-4 w-16 rounded-pastilla" />
              )}
              {stats?.[i]?.compactDetail ? <Skeleton className="h-4 w-10 rounded-pastilla" /> : null}
            </div>
          ))}
        </div>
      ) : null}
      <div
        aria-hidden="true"
        className={cx(
          "grid-cols-1 gap-4",
          compact ? "hidden sm:grid" : "grid",
          total === 3 ? "sm:grid-cols-3" : total === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-4",
        )}
      >
        {Array.from({ length: total }, (_, i) => {
          const stat = stats?.[i];
          return (
            <div
              key={i}
              className="relative flex flex-col gap-2 overflow-hidden rounded-tarjeta border border-borde bg-superficie p-5 shadow-1"
            >
              <span className="absolute inset-x-0 top-0 h-1 bg-borde" />
              <div className="flex items-start justify-between gap-3">
                {stat ? (
                  <p className="text-sm font-semibold text-tinta-suave">{stat.label}</p>
                ) : (
                  <Skeleton className="h-4 w-24 rounded-pastilla" />
                )}
                {stat?.icon ? (
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-marca-50 text-marca-600 [&>svg]:size-5">
                    {stat.icon}
                  </span>
                ) : (
                  <Skeleton className="size-10 rounded-full" />
                )}
              </div>
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-4 w-32 rounded-pastilla" />
            </div>
          );
        })}
      </div>
    </>
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
  bare = false,
}: {
  columns: readonly string[];
  rows?: number;
  cardDetails?: number;
  /** Si la tarjeta móvil real lleva un botón al pie. */
  cardAction?: boolean;
  /**
   * `filas`: en el teléfono, filas separadas por líneas (sin tarjeta propia),
   * para listas que ya van dentro de una tarjeta de sección. `reservas`: igual,
   * pero agrupadas por reserva (código y pago arriba, pasajeros debajo), como
   * la lista de pasajeros de la hoja de salida.
   */
  mobileVariant?: "tarjetas" | "filas" | "reservas";
  /**
   * La tabla va de borde a borde dentro de una tarjeta de sección (sin marco
   * propio), como la lista de pasajeros de la hoja de salida.
   */
  bare?: boolean;
}) {
  return (
    <>
      <div
        aria-hidden="true"
        className={cx(
          "hidden md:block",
          bare ? "-m-5" : "overflow-hidden rounded-tarjeta border border-borde bg-superficie shadow-1",
        )}
      >
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
      {mobileVariant === "reservas" ? (
        <div aria-hidden="true" className="flex flex-col divide-y divide-borde md:hidden">
          {Array.from({ length: Math.min(rows, 3) }, (_, row) => (
            <div key={row} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0">
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <p className="text-sm text-tinta-suave">Código de reserva</p>
                  <Skeleton className="h-5 w-40 rounded-pastilla" />
                </div>
                <Skeleton className="h-6 w-24 rounded-pastilla" />
              </div>
              <div className="flex flex-col gap-3 border-l-2 border-borde pl-3">
                {Array.from({ length: row === 0 ? 2 : 1 }, (_, i) => (
                  <div key={i} className="flex flex-col gap-1.5">
                    <Skeleton className="h-6 w-2/3 rounded-pastilla" />
                    <Skeleton className="h-5 w-1/2 rounded-pastilla" />
                    <Skeleton className="h-6 w-28 rounded-pastilla" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : mobileVariant === "filas" ? (
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

/**
 * Tarjeta de sección (`SectionCard`) con su título real y el cuerpo que se
 * pase. `description` pinta real una frase fija conocida ("Sigue los pasos en
 * orden…"); sin ella va una barra.
 */
export function SkeletonSectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div aria-hidden="true" className="rounded-tarjeta border border-borde bg-superficie shadow-1">
      <div className="flex flex-col gap-1.5 border-b border-borde px-5 py-4">
        <p className="text-lg font-semibold text-tinta">{title}</p>
        {description ? (
          <p className="text-sm leading-snug text-tinta-suave">{description}</p>
        ) : (
          <Skeleton className="h-4 w-2/3 max-w-sm rounded-pastilla" />
        )}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

/** Panel lateral mientras carga: la misma caja que `SidePanel`, con el título real y campos en barra. */
export function SkeletonSidePanel({ title, fields = 4 }: { title: string; fields?: number }) {
  return (
    // Sin `aria-busy`: una región ocupada retiene su anuncio y el lector no
    // diría "Cargando el formulario…" (mismo criterio que `SkeletonScreen`).
    <div className="fixed inset-0 z-50 flex justify-end" role="status" aria-live="polite">
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
