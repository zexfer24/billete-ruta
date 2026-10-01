import { Skeleton, SkeletonText } from "@/components/skeleton";
import { PANEL_TD_CLASS, PANEL_TH_CLASS, panelButtonClass } from "@/components/panel-ui";
import { IconChevronRight } from "@/components/icons";

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
      <div className="flex w-full flex-wrap gap-1 rounded-tarjeta border border-borde bg-superficie p-1 shadow-1">
        {labels.map((label) => (
          <span
            key={label}
            className="inline-flex min-h-11 grow items-center justify-center gap-2 rounded-control px-4 text-[15px] font-semibold text-tinta-suave sm:grow-0 sm:justify-start"
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

/** Qué lista reproduce la silueta: la cola de comprobantes o las reservas. */
export type ListSkeletonVariant = "comprobantes" | "reservas";

/** Cabeceras reales de cada tabla, las mismas de `passenger-list.tsx`. */
const TABLE_HEADERS: Record<ListSkeletonVariant, readonly string[]> = {
  comprobantes: ["Pasajero", "Viaje", "Monto enviado", "Qué cubre"],
  reservas: ["Pasajero", "Viaje", "Pagado", "Estado"],
};

/** Texto real del enlace de cada fila de la tabla. */
const ROW_LINK_LABELS: Record<ListSkeletonVariant, string> = {
  comprobantes: "Revisar",
  reservas: "Ver detalle",
};

/** Etiquetas de los dos datos de la tarjeta del teléfono. */
const CARD_LABELS: Record<ListSkeletonVariant, readonly [string, string]> = {
  comprobantes: ["Monto enviado", "Si lo apruebas"],
  reservas: ["Pagado", "Falta"],
};

/** Barras de texto de 14 px apiladas como líneas de una celda (20 px por línea). */
function CellLines({ widths }: { widths: readonly string[] }) {
  return (
    <div className="flex flex-col gap-1">
      {widths.map((width, i) => (
        <Skeleton key={i} className={`h-4 rounded-pastilla ${width}`} />
      ))}
    </div>
  );
}

/** Tercera y cuarta columna de una fila de tabla, según la vista. */
function RowStatusCells({ variant }: { variant: ListSkeletonVariant }) {
  if (variant === "comprobantes") {
    return (
      <>
        <td className={PANEL_TD_CLASS}>
          {/* Monto, equivalente, «Referencia» y el código, que baja de línea. */}
          <CellLines widths={["w-24", "w-28", "w-20", "w-32"]} />
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

/**
 * Silueta de la lista: con `filters`, la tarjeta de filtros; luego la línea
 * de conteo y la tabla (desde `xl`) o tarjetas, como `ResponsiveTable`. Las
 * cabeceras de la tabla y las etiquetas de las tarjetas son textos fijos y se
 * pintan reales; las filas y las tarjetas tienen las mismas líneas que las de
 * verdad, para que la lista no salte al llegar los datos.
 */
export function ListSkeleton({
  rows = 8,
  filters = false,
  variant = "comprobantes",
}: {
  rows?: number;
  filters?: boolean;
  variant?: ListSkeletonVariant;
}) {
  const [labelA, labelB] = CARD_LABELS[variant];
  return (
    <div aria-hidden="true" className="flex flex-col gap-6">
      {filters ? <FiltersSkeleton /> : null}
      <div className="flex flex-col gap-4">
        <Skeleton className="h-5 w-56 rounded-pastilla" />

        <div className="hidden overflow-hidden rounded-tarjeta border border-borde bg-superficie shadow-1 xl:block">
          <table className="w-full text-left">
            <thead className="border-b border-borde">
              <tr>
                {TABLE_HEADERS[variant].map((header) => (
                  <th key={header} scope="col" className={PANEL_TH_CLASS}>
                    {header}
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
                    <span className={panelButtonClass("secundario")}>{ROW_LINK_LABELS[variant]}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:hidden">
          {Array.from({ length: 4 }, (_, i) =>
            variant === "comprobantes" ? <ProofCardSkeleton key={i} /> : <ReservationCardSkeleton key={i} labels={[labelA, labelB]} />,
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Tarjeta de comprobante del teléfono (`ProofQueueCard`): toda la tarjeta es
 * el enlace, con la flecha a la derecha; nombre, pastillas, cédula y código,
 * viaje, monto enviado y qué pasa si se aprueba.
 */
function ProofCardSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-tarjeta border border-borde bg-superficie p-4 shadow-1">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex h-6 items-center">
          <Skeleton className="h-5 w-2/3 rounded-pastilla" />
        </span>
        <Skeleton className="h-7 w-36 rounded-pastilla" />
        <CellLines widths={["w-3/4", "w-4/5"]} />
        <span className="flex h-6 items-center">
          <Skeleton className="h-4 w-1/2 rounded-pastilla" />
        </span>
        <CellLines widths={["w-2/3"]} />
      </div>
      <IconChevronRight className="size-5 shrink-0 text-marca-700" />
    </div>
  );
}

/** Tarjeta de reserva del teléfono (`MobileCard`): datos, los dos montos y «Ver detalle». */
function ReservationCardSkeleton({ labels }: { labels: readonly [string, string] }) {
  return (
    <div className="flex flex-col gap-3 rounded-tarjeta border border-borde bg-superficie p-4 shadow-1">
      <div className="flex flex-col gap-1">
        <Skeleton className="h-5 w-2/3 rounded-pastilla" />
        <Skeleton className="my-1.5 h-7 w-36 rounded-pastilla" />
        <CellLines widths={["w-24", "w-36", "w-3/4"]} />
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {labels.map((label) => (
          <div key={label} className="flex min-w-0 flex-col gap-1">
            <span className="text-sm text-tinta-suave">{label}</span>
            <Skeleton className="h-5 w-24 rounded-pastilla" />
          </div>
        ))}
      </div>
      <span className={panelButtonClass("secundario", "md", "w-full")}>Ver detalle</span>
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
