import { Skeleton, SkeletonButton, SkeletonText } from "@/components/skeleton";
import { PANEL_TD_CLASS, PANEL_TH_CLASS } from "@/components/panel-ui";
import { IconChevronRight } from "@/components/icons";
import { TABS_CONTAINER_CLASS, tabItemLayoutClass } from "./tab-layout";

/**
 * Siluetas de carga de "Pasajeros y pagos" (spec 6.5), compartidas por
 * `loading.tsx` y por los `<Suspense>` de la lista y del panel lateral: misma
 * tabla en escritorio, mismas tarjetas en pantallas angostas.
 */

/**
 * Pestañas de la silueta con sus etiquetas reales y el contador en barra.
 * Ninguna va marcada: sin vista en la URL, la activa depende de si hay
 * comprobantes esperando, y la silueta no lo sabe.
 */
export function TabsSkeleton({ labels }: { labels: readonly string[] }) {
  return (
    <div aria-hidden="true">
      <div className={TABS_CONTAINER_CLASS}>
        {labels.map((label, index) => (
          <span
            key={label}
            className={`inline-flex min-h-11 grow items-center justify-center gap-2 rounded-control px-4 text-[15px] font-semibold text-tinta-suave sm:grow-0 sm:justify-start ${tabItemLayoutClass(index, labels.length)}`}
          >
            {label}
            <Skeleton className="h-5 w-7 rounded-pastilla" />
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Silueta de los filtros (salida, búsqueda y botón), con sus etiquetas
 * reales. Solo la llevan las vistas de reservas: "Por revisar" no tiene.
 */
function FiltersSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-tarjeta border border-borde bg-superficie p-4 shadow-1 md:flex-row md:flex-wrap md:items-end">
      <div className="flex flex-col gap-1.5 md:w-80">
        <span className="text-sm font-semibold text-tinta">Salida</span>
        <Skeleton className="h-11 w-full" />
      </div>
      <div className="flex flex-col gap-1.5 md:min-w-64 md:flex-1">
        <span className="text-sm font-semibold text-tinta">Buscar</span>
        <Skeleton className="h-11 w-full" />
      </div>
      <Skeleton className="h-11 w-28" />
    </div>
  );
}

/**
 * Qué lista reproduce la silueta: la cola de comprobantes, las reservas o
 * `neutra`, para cuando no se sabe qué vista va a abrir (el `loading.tsx` de
 * la ruta: desde el tablero se llega con `?vista=pagadas` o `?vista=por-cobrar`,
 * y sin vista la página abre "Por revisar" o "Todas"). La neutra solo pinta
 * reales los textos que comparten las dos tablas.
 */
export type ListSkeletonVariant = "comprobantes" | "reservas" | "neutra";

/** Cabeceras de cada tabla, las mismas de `passenger-list.tsx`; `null` es una barra. */
const TABLE_HEADERS: Record<ListSkeletonVariant, readonly (string | null)[]> = {
  comprobantes: ["Pasajero", "Viaje", "Monto enviado", "Qué cubre"],
  reservas: ["Pasajero", "Viaje", "Pagado", "Estado"],
  neutra: ["Pasajero", "Viaje", null, null],
};

/** Texto real del enlace de cada fila y de cada tarjeta; `null` es una barra. */
const ROW_LINK_LABELS: Record<ListSkeletonVariant, string | null> = {
  comprobantes: "Revisar",
  reservas: "Ver detalle",
  neutra: null,
};

/**
 * Barras de texto de 14 px apiladas como líneas de una celda: cada barra de
 * 16 px va centrada en un renglón de 20 px, el alto de la línea real, para que
 * la fila mida lo mismo que la de verdad.
 */
function CellLines({ widths }: { widths: readonly string[] }) {
  return (
    <div className="flex flex-col">
      {widths.map((width, i) => (
        <span key={i} className="flex h-5 items-center">
          <Skeleton className={`h-4 rounded-pastilla ${width}`} />
        </span>
      ))}
    </div>
  );
}

/**
 * Filas de la tabla en la silueta: las de una página de "Por revisar"
 * (`PROOFS_PAGE_SIZE` de `passenger-list.tsx`). Las otras vistas traen más por
 * página, pero de la fila quince en adelante ya no se ve al cargar.
 */
const SKELETON_ROWS = 15;

/** Pie de la lista: "Página 1 de 4" y el botón "Siguiente", quietos. */
function PaginationSkeleton() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <span className="flex h-6 items-center">
        <Skeleton className="h-4 w-28 rounded-pastilla" />
      </span>
      <SkeletonButton>Siguiente</SkeletonButton>
    </div>
  );
}

/** Tercera y cuarta columna de una fila de tabla, según la vista. */
function RowStatusCells({ variant }: { variant: ListSkeletonVariant }) {
  if (variant === "reservas") {
    return (
      <>
        <td className={PANEL_TD_CLASS}>
          <div className="flex min-w-44 flex-col gap-1.5">
            <CellLines widths={["w-32"]} />
            <Skeleton className="h-2 w-full rounded-pastilla" />
          </div>
        </td>
        <td className={PANEL_TD_CLASS}>
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-7 w-24 rounded-pastilla" />
            <CellLines widths={["w-28"]} />
          </div>
        </td>
      </>
    );
  }
  // Comprobantes (y la neutra, que toma su forma): monto, equivalente y la
  // referencia en una línea; luego la pastilla de qué cubre y una línea.
  return (
    <>
      <td className={PANEL_TD_CLASS}>
        <CellLines widths={["w-24", "w-28", "w-32"]} />
      </td>
      <td className={PANEL_TD_CLASS}>
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-7 w-32 rounded-pastilla" />
          <CellLines widths={["w-40"]} />
        </div>
      </td>
    </>
  );
}

/**
 * Silueta de la lista: con `filters`, la tarjeta de filtros; luego la línea
 * de conteo y la tabla (desde `xl`) o tarjetas, como `ResponsiveTable`. Las
 * cabeceras de la tabla y la acción de las tarjetas son textos fijos y se
 * pintan reales (salvo en la variante `neutra`); las filas y las tarjetas
 * tienen las mismas líneas que las de verdad, para que la lista no salte al
 * llegar los datos.
 */
export function ListSkeleton({
  rows = SKELETON_ROWS,
  filters = false,
  variant = "neutra",
}: {
  rows?: number;
  filters?: boolean;
  variant?: ListSkeletonVariant;
}) {
  const linkLabel = ROW_LINK_LABELS[variant];
  return (
    <div aria-hidden="true" className="flex flex-col gap-6">
      {filters ? <FiltersSkeleton /> : null}
      <div className="flex flex-col gap-4">
        <Skeleton className="h-5 w-56 rounded-pastilla" />

        <div className="hidden overflow-hidden rounded-tarjeta border border-borde bg-superficie shadow-1 xl:block">
          <table className="w-full text-left">
            <thead className="border-b border-borde">
              <tr>
                {TABLE_HEADERS[variant].map((header, i) => (
                  <th key={header ?? `barra-${i}`} scope="col" className={PANEL_TH_CLASS}>
                    {header ?? <Skeleton className="h-4 w-24 rounded-pastilla" />}
                  </th>
                ))}
                <th scope="col" className={PANEL_TH_CLASS} />
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: rows }, (_, i) => (
                <tr key={i} className="border-b border-borde last:border-b-0">
                  <td className={PANEL_TD_CLASS}>
                    <CellLines widths={["w-40", "w-24", "w-36"]} />
                  </td>
                  <td className={PANEL_TD_CLASS}>
                    <CellLines widths={["w-36", "w-28"]} />
                  </td>
                  <RowStatusCells variant={variant} />
                  <td className={`${PANEL_TD_CLASS} text-right`}>
                    {/* Quieto, con el brillo de carga en vez del borde, como el
                        resto de los botones del panel mientras carga. Sin saber si
                        es "Revisar" o "Ver detalle", un bloque de un ancho entre los dos. */}
                    {linkLabel ? (
                      <SkeletonButton>{linkLabel}</SkeletonButton>
                    ) : (
                      <Skeleton className="ml-auto h-11 w-24" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:hidden">
          {Array.from({ length: 4 }, (_, i) => (
            <CardSkeleton key={i} actionLabel={linkLabel} />
          ))}
        </div>

        <PaginationSkeleton />
      </div>
    </div>
  );
}

/**
 * Tarjeta del teléfono y la tableta (`LinkCard` de `passenger-list.tsx`), la
 * misma en las cinco pestañas: nombre, pastilla, cédula y código, viaje, el
 * dato de dinero y, al pie, la acción con su flecha (en barra si no se sabe
 * qué vista abre).
 */
function CardSkeleton({ actionLabel }: { actionLabel: string | null }) {
  return (
    <div className="flex flex-col gap-1 rounded-tarjeta border border-borde bg-superficie p-4 shadow-1">
      <span className="flex h-6 items-center">
        <Skeleton className="h-5 w-2/3 rounded-pastilla" />
      </span>
      <Skeleton className="h-7 w-36 rounded-pastilla" />
      <span className="flex h-5 items-center">
        <Skeleton className="h-4 w-3/4 rounded-pastilla" />
      </span>
      <span className="flex h-5 items-center">
        <Skeleton className="h-4 w-4/5 rounded-pastilla" />
      </span>
      <span className="flex h-6 items-center">
        <Skeleton className="h-4 w-1/2 rounded-pastilla" />
      </span>
      <span className="mt-1 inline-flex min-h-6 items-center gap-1 text-[15px] font-semibold text-marca-700">
        {actionLabel ?? <Skeleton className="h-4 w-20 rounded-pastilla" />}
        <IconChevronRight className="size-5 shrink-0" />
      </span>
    </div>
  );
}

/** Silueta del cuerpo de un panel lateral: resumen, imagen o sección principal y datos. */
export function PanelBodySkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-tarjeta border border-borde bg-lienzo p-4">
        <Skeleton className="h-6 w-1/2 rounded-pastilla" />
        <Skeleton className="h-4 w-2/3 rounded-pastilla" />
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-2 w-full rounded-pastilla" />
      </div>
      <Skeleton className="h-48 w-full" />
      <SkeletonText lines={4} />
      <Skeleton className="h-12 w-full sm:w-48" />
    </div>
  );
}
