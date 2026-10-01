import type { ReactNode } from "react";
import { IconChevronRight } from "@/components/icons";
import { Skeleton } from "@/components/skeleton";
import { PANEL_BUTTON_SIZE_CLASSES, cx, type PanelButtonSize } from "@/components/ui-classes";
import { ADMIN_TD_CLASS, ADMIN_TH_CLASS } from "./lists";
import { ADMIN_TAB_ACTIVE_CLASS, ADMIN_TAB_CLASS, ADMIN_TABS_GRID_CLASS, ADMIN_TABS_ROW_CLASS } from "./tab-classes";

/**
 * Siluetas de carga de las pantallas del administrador (spec 6.5). Reproducen
 * las piezas reales con sus alturas y radios: pestañas de 44 px, tarjetas de
 * cifra, tablas en escritorio y tarjetas en móvil. Como en el kit del panel
 * de agencia (`src/app/panel/_shared/skeletons.tsx`), los textos fijos
 * (pestañas, cabeceras de tabla, títulos de sección y etiquetas de cifra) se
 * pintan reales y solo los datos van en barras.
 *
 * Los controles (campos, listas desplegables y botones) llevan el brillo de
 * `.esqueleto`, nunca su borde ni su relleno real, como en los formularios
 * de ingresar (`src/app/_publico/form-skeleton.tsx`): así nadie escribe en un
 * campo que todavía no recibe el texto ni pulsa un botón que todavía no
 * responde. El texto de un botón sí puede ir real, para leer qué hará.
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
 * Campo o lista desplegable del panel mientras carga: un bloque con brillo de
 * su misma altura (44 px) y radio, sin el borde de control.
 */
export function InputSkeleton({ className }: { className?: string }) {
  return <span className={cx("esqueleto block min-h-11 w-full rounded-control", className)} />;
}

/**
 * Botón del panel mientras carga: su texto (y su icono) reales en marca-700
 * sobre el brillo, con las medidas de `panelButtonClass` del mismo `size`,
 * sin el relleno morado ni el borde: se lee qué hará, pero no parece listo.
 */
export function ButtonSkeleton({
  children,
  size = "md",
  className,
}: {
  children: ReactNode;
  size?: PanelButtonSize;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "esqueleto inline-flex items-center justify-center gap-2 rounded-control text-center font-semibold leading-tight text-marca-700",
        PANEL_BUTTON_SIZE_CLASSES[size],
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * Pestañas de `AdminTabs` con sus etiquetas reales: mismas medidas y el
 * mismo reparto en varias filas en pantallas angostas. Por defecto ninguna va
 * marcada, porque un `loading.tsx` no conoce `?periodo=` ni `?status=` (igual
 * que `SkeletonTabs` del panel de agencia); `active` solo se pasa desde un
 * `Suspense` que ya sabe cuál es. `counts` pinta el hueco del contador.
 */
export function TabsSkeleton({
  labels,
  active = -1,
  counts = false,
  grid = false,
}: {
  labels: readonly string[];
  active?: number;
  counts?: boolean;
  /** Rejilla de dos columnas en el teléfono, como `AdminTabs` con `grid` (las pestañas de periodo). */
  grid?: boolean;
}) {
  return (
    <div aria-hidden="true" className={grid ? ADMIN_TABS_GRID_CLASS : ADMIN_TABS_ROW_CLASS}>
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
 * Paginación de arriba de una lista paginada (`Pagination`): solo la posición
 * en barra, en una fila de 44 px como la real. Sin botones: mientras carga no
 * se sabe si hay una página siguiente (ni si hay una anterior).
 */
export function PaginationSkeleton() {
  return (
    <div aria-hidden="true" className="flex min-h-11 items-center">
      <LineSkeleton className="w-28" />
    </div>
  );
}

/**
 * Tarjeta de cifra (`StatCard`): la etiqueta y el icono reales (son fijos,
 * como en el kit del panel de agencia), la cifra y el detalle en barras y, si
 * la tarjeta real es un enlace, su "Ver detalle".
 */
export function StatCardSkeleton({
  label,
  icon,
  link = false,
}: {
  label: string;
  /** El mismo icono que lleva la `StatCard` real. */
  icon: ReactNode;
  link?: boolean;
}) {
  return (
    <div aria-hidden="true" className={`${CARD} relative flex flex-col overflow-hidden p-5`}>
      {/* La barra neutra de las tarjetas de cifra del terminal: como en el panel
          de agencia, el morado queda solo para la tarjeta en vivo. */}
      <span className="absolute inset-x-0 top-0 h-1 bg-borde" />
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-tinta-suave">{label}</p>
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-marca-50 text-marca-600 [&>svg]:size-5">
          {icon}
        </span>
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
 * Columna de la tabla en la silueta: su cabecera real y cómo es su celda, para
 * que la tabla de carga sea un `<table>` de verdad y el navegador reparta los
 * anchos como en la real (sin saltos al llegar los datos).
 */
export interface SkeletonColumn {
  /** Cabecera real; vacía en la columna de la flecha o de la acción. */
  label: string;
  /**
   * Ancho de cada línea de la celda (clases de Tailwind de ancho fijo, como
   * `w-24`): la primera de 16 px y las demás de 14 px, tantas como la real.
   */
  lines?: readonly string[];
  /** `chevron`: la flecha del enlace al detalle; `action`: un botón `sm` (Desactivar). */
  kind?: "text" | "chevron" | "action";
  /** Columna de cifras alineada a la derecha, como en la real. */
  align?: "right";
  /** Bloque de color de la agencia a la izquierda de las líneas. */
  badge?: boolean;
  /** Pastilla de estado bajo las líneas. */
  pill?: boolean;
}

/** Une las cabeceras reales de una tabla con la descripción de sus celdas, en el mismo orden. */
export function skeletonColumns(
  labels: readonly string[],
  cells: readonly Omit<SkeletonColumn, "label">[],
): SkeletonColumn[] {
  return labels.map((label, index) => ({ label, ...cells[index] }));
}

/** Celda de datos de la silueta, según su descripción. */
function SkeletonCell({ column, tdClass }: { column: SkeletonColumn; tdClass: string }) {
  if (column.kind === "chevron") {
    return (
      <td className={cx(tdClass, "px-2 text-right")}>
        <span
          className={cx(
            "inline-flex items-center justify-center rounded-control text-marca-700",
            PANEL_BUTTON_SIZE_CLASSES.md,
          )}
        >
          <IconChevronRight className="size-5 shrink-0" />
        </span>
      </td>
    );
  }
  if (column.kind === "action") {
    return (
      <td className={tdClass}>
        <div className="flex justify-end">
          <Skeleton className="h-10 w-28" />
        </div>
      </td>
    );
  }
  const lines = column.lines ?? ["w-24"];
  return (
    <td className={cx(tdClass, column.align === "right" && "text-right")}>
      <div className="flex items-start gap-3">
        {column.badge ? <Skeleton className="h-8 w-12 shrink-0" /> : null}
        <div className={cx("flex flex-col gap-1.5", column.align === "right" && "ml-auto items-end")}>
          {lines.map((width, line) => (
            <Skeleton key={line} className={cx(line === 0 ? "h-4" : "h-3.5", "rounded-pastilla", width)} />
          ))}
          {column.pill ? <Skeleton className="h-6 w-16 rounded-pastilla" /> : null}
        </div>
      </div>
    </td>
  );
}

/**
 * Tabla del panel: en escritorio, un `<table>` con las cabeceras reales y las
 * celdas descritas por `columns` (`SkeletonColumn`), con las mismas clases de
 * celda que la real (`thClass`, `tdClass`); en móvil, tarjetas con título,
 * datos y, si la real lo lleva, el botón o la flecha de la tarjeta que es un
 * enlace (`mobileChevron`).
 */
export function TableSkeleton({
  columns,
  thClass = ADMIN_TH_CLASS,
  tdClass = ADMIN_TD_CLASS,
  rows = 6,
  mobileCards = 3,
  mobileDetails = 4,
  mobileDetailLabels,
  mobileStatus = false,
  mobileAction = false,
  mobileSubtitleLines = 1,
  mobileTextLines = 0,
  mobileChevron = false,
  mobileMore = false,
}: {
  columns: readonly SkeletonColumn[];
  /** Clases de cabecera y de celda de la tabla real (las del terminal por defecto). */
  thClass?: string;
  tdClass?: string;
  rows?: number;
  mobileCards?: number;
  mobileDetails?: number;
  /** Etiquetas fijas de los datos de la tarjeta: se pintan reales en vez de en barra. */
  mobileDetailLabels?: readonly string[];
  mobileStatus?: boolean;
  mobileAction?: boolean;
  /** Líneas secundarias bajo el título de la tarjeta (destinatario y hora, por ejemplo). */
  mobileSubtitleLines?: number;
  /** Líneas de un párrafo de texto corrido bajo la cabecera de la tarjeta (el texto de un mensaje). */
  mobileTextLines?: number;
  /** Flecha a la derecha, centrada, como la tarjeta real que abre un detalle (movimientos). */
  mobileChevron?: boolean;
  /** El "Ver N más" de `MobileCardList` bajo las tarjetas. */
  mobileMore?: boolean;
}) {
  return (
    <>
      <div aria-hidden="true" className={`${CARD} hidden overflow-hidden md:block`}>
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-borde">
              {columns.map((column, index) => (
                <th key={index} className={cx(thClass, column.align === "right" && "text-right")}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }, (_, row) => (
              <tr key={row} className="border-b border-borde last:border-0">
                {columns.map((column, index) => (
                  <SkeletonCell key={index} column={column} tdClass={tdClass} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div aria-hidden="true" className="flex flex-col gap-3 md:hidden">
        {Array.from({ length: mobileCards }, (_, index) => {
          const body = (
            <>
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-1 flex-col gap-1.5">
                  <Skeleton className="h-5 w-3/5 rounded-pastilla" />
                  {Array.from({ length: mobileSubtitleLines }, (_, line) => (
                    <Skeleton key={line} className={`h-4 rounded-pastilla ${line === 0 ? "w-2/5" : "w-3/5"}`} />
                  ))}
                </div>
                {mobileStatus ? <Skeleton className="h-6 w-20 rounded-pastilla" /> : null}
              </div>
              {mobileTextLines > 0 ? (
                <div className="flex flex-col gap-2">
                  {Array.from({ length: mobileTextLines }, (_, line) => (
                    <Skeleton
                      key={line}
                      className={`h-3.5 rounded-pastilla ${line === mobileTextLines - 1 ? "w-3/5" : "w-full"}`}
                    />
                  ))}
                </div>
              ) : null}
              {mobileDetails > 0 ? (
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  {Array.from({ length: mobileDetails }, (_, detail) => (
                    <div key={detail} className="flex flex-col gap-1">
                      {mobileDetailLabels?.[detail] ? (
                        <p className="text-sm text-tinta-suave">{mobileDetailLabels[detail]}</p>
                      ) : (
                        <Skeleton className="h-3.5 w-16 rounded-pastilla" />
                      )}
                      <Skeleton className="h-4 w-24 rounded-pastilla" />
                    </div>
                  ))}
                </div>
              ) : null}
              {mobileAction ? <Skeleton className="h-11 w-full" /> : null}
            </>
          );
          return mobileChevron ? (
            <div key={index} className={`${CARD} flex items-center gap-3 p-4`}>
              <div className="flex min-w-0 flex-1 flex-col gap-3">{body}</div>
              <IconChevronRight className="size-5 shrink-0 text-marca-700" />
            </div>
          ) : (
            <div key={index} className={`${CARD} flex flex-col gap-3 p-4`}>
              {body}
            </div>
          );
        })}
        {mobileMore ? (
          <div className="flex min-h-11 items-center">
            <Skeleton className="h-5 w-36 rounded-pastilla" />
          </div>
        ) : null}
      </div>
    </>
  );
}
