import { Skeleton, SkeletonText } from "@/components/skeleton";

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
    <div aria-hidden="true" className="-m-1 overflow-x-hidden p-1">
      <div className="inline-flex min-w-full gap-1 rounded-tarjeta border border-borde bg-superficie p-1 shadow-1">
        {labels.map((label) => (
          <span
            key={label}
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-control px-4 text-[15px] font-semibold text-tinta-suave"
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
 * Silueta de la lista: con `filters`, la tarjeta de filtros; luego la línea
 * de conteo y la tabla (desde `xl`) o tarjetas, como `ResponsiveTable`.
 */
export function ListSkeleton({ rows = 8, filters = false }: { rows?: number; filters?: boolean }) {
  return (
    <div aria-hidden="true" className="flex flex-col gap-6">
      {filters ? <FiltersSkeleton /> : null}
      <div className="flex flex-col gap-4">
        <Skeleton className="h-5 w-56 rounded-pastilla" />

        <div className="hidden overflow-hidden rounded-tarjeta border border-borde bg-superficie shadow-1 xl:block">
          <div className="flex gap-6 border-b border-borde px-4 py-3.5">
            {["w-24", "w-20", "w-16", "w-16", "w-20"].map((width, i) => (
              <Skeleton key={i} className={`h-4 rounded-pastilla ${width} ${i === 4 ? "ml-auto" : ""}`} />
            ))}
          </div>
          {Array.from({ length: rows }, (_, i) => (
            <div key={i} className="flex items-center gap-6 border-b border-borde px-4 py-3 last:border-0">
              <div className="flex w-1/4 flex-col gap-2">
                <Skeleton className="h-4 w-3/4 rounded-pastilla" />
                <Skeleton className="h-4 w-1/2 rounded-pastilla" />
              </div>
              <div className="flex w-1/4 flex-col gap-2">
                <Skeleton className="h-4 w-2/3 rounded-pastilla" />
                <Skeleton className="h-4 w-1/2 rounded-pastilla" />
              </div>
              <div className="flex w-1/5 flex-col gap-2">
                <Skeleton className="h-4 w-3/4 rounded-pastilla" />
                <Skeleton className="h-2 w-full rounded-pastilla" />
              </div>
              <Skeleton className="h-6 w-24 rounded-pastilla" />
              <Skeleton className="ml-auto h-11 w-28" />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:hidden">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex flex-col gap-3 rounded-tarjeta border border-borde bg-superficie p-4 shadow-1">
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-5 w-2/3 rounded-pastilla" />
                  <Skeleton className="h-4 w-1/2 rounded-pastilla" />
                </div>
                <Skeleton className="h-6 w-20 rounded-pastilla" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
              </div>
              <Skeleton className="h-11 w-full" />
            </div>
          ))}
        </div>
      </div>
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
