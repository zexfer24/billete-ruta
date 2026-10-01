import type { ReactNode } from "react";
import { IconChevronDown, IconChevronRight } from "@/components/icons";
import { Skeleton } from "@/components/skeleton";
import { cx, panelButtonClass, panelInputClass } from "@/components/ui-classes";
import { ADMIN_TAB_ACTIVE_CLASS, ADMIN_TAB_CLASS, ADMIN_TABS_ROW_CLASS } from "./tab-classes";

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
 * Cabecera de página (`PanelPageHeader`) con su título y su frase reales, pero
 * quieta: el título es un `<p>` con las clases del `h1`, para que la página
 * tenga un solo `h1` y el lector de pantalla no lo oiga dentro del aviso de
 * carga. `actions` es la copia quieta de los botones de la cabecera.
 */
export function PageHeaderSkeleton({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div aria-hidden="true" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-3xl">
          <p className="text-2xl font-bold tracking-tight text-tinta sm:text-3xl">{title}</p>
          <p className="mt-1.5 text-base leading-relaxed text-tinta-suave">{description}</p>
        </div>
        {actions ? (
          <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2 sm:shrink-0">{actions}</div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Campo vacío y quieto, con el borde y el fondo del campo real: un campo
 * nunca es un bloque lila, así que no cambia de aspecto al llegar la página.
 * `select` le agrega la flecha de la lista desplegable.
 */
export function InputSkeleton({ className, select = false }: { className?: string; select?: boolean }) {
  return (
    <span className={panelInputClass(cx("relative block", className))}>
      {select ? (
        <IconChevronDown className="absolute right-3 top-1/2 size-5 -translate-y-1/2 text-tinta-suave" />
      ) : null}
    </span>
  );
}

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
    <div aria-hidden="true" className={ADMIN_TABS_ROW_CLASS}>
      {labels.map((label, index) => (
        <span key={label} className={cx(ADMIN_TAB_CLASS, index === active ? ADMIN_TAB_ACTIVE_CLASS : "text-tinta-suave")}>
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
      {/* La barra de color de las tarjetas del terminal, que siempre van en tono de marca. */}
      <span className="absolute inset-x-0 top-0 h-1 bg-marca-600" />
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

/**
 * Formulario de filtros en una tarjeta: listas desplegables vacías de 44 px
 * con su etiqueta real, y el botón.
 */
export function FilterCardSkeleton({ labels, button }: { labels: readonly string[]; button: string }) {
  return (
    <div aria-hidden="true" className={`${CARD} flex flex-wrap items-end gap-3 p-4`}>
      {labels.map((label) => (
        <div key={label} className="flex min-w-56 flex-1 flex-col gap-1.5 sm:flex-none">
          <p className="text-sm font-semibold text-tinta">{label}</p>
          <InputSkeleton select className="sm:w-64" />
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
export function SectionHeadingSkeleton({
  title,
  description,
  action,
}: {
  title: string;
  description?: ReactNode;
  /** Enlace fijo a la derecha del título, como "Ver todos los movimientos". */
  action?: ReactNode;
}) {
  const heading = (
    <div className="flex min-w-0 flex-col gap-1">
      <p className="text-lg font-semibold text-tinta">{title}</p>
      {description ? (
        <p className="text-sm leading-snug text-tinta-suave">{description}</p>
      ) : (
        <Skeleton className="mt-1 h-4 w-2/3 max-w-sm rounded-pastilla" />
      )}
    </div>
  );
  if (!action) return <div aria-hidden="true">{heading}</div>;
  return (
    <div aria-hidden="true" className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
      {heading}
      {action}
    </div>
  );
}
