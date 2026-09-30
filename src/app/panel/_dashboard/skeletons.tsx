import { Skeleton, SkeletonCircle } from "@/components/skeleton";

/**
 * Siluetas de carga de los bloques del tablero (spec 6.5). Las comparten
 * `loading.tsx` (primera carga) y los `<Suspense>` de cada bloque, para que el
 * paso de una a otra no haga saltar la pantalla: mismas alturas, radios y
 * número de filas que el bloque real.
 */

/** Silueta de "Lo que necesita tu atención": dos avisos con su botón. */
export function AttentionSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-3">
      {[0, 1].map((i) => (
        <div
          key={i}
          className="flex flex-col gap-3 rounded-control border border-borde bg-superficie px-4 py-3.5 sm:flex-row sm:items-center"
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

/** Silueta de una tarjeta de cifra (`StatCard` con icono y "Ver detalle"). */
function StatCardSkeleton() {
  return (
    <div className="flex flex-col rounded-tarjeta border border-borde bg-superficie p-5 shadow-1">
      <div className="flex items-start justify-between gap-3">
        <Skeleton className="h-4 w-28 rounded-pastilla" />
        <SkeletonCircle className="size-10" />
      </div>
      <Skeleton className="mt-1 h-9 w-24" />
      <Skeleton className="mt-2 h-4 w-3/4 rounded-pastilla" />
      <Skeleton className="mt-4 h-4 w-20 rounded-pastilla" />
    </div>
  );
}

/** Silueta de las cuatro cifras del periodo. */
export function FiguresSkeleton() {
  return (
    <div aria-hidden="true" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <StatCardSkeleton key={i} />
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
 * Silueta de una tarjeta de sección (`SectionCard`): cabecera con título,
 * descripción y botón, y el cuerpo con `rows` filas.
 */
export function SectionSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div aria-hidden="true" className="rounded-tarjeta border border-borde bg-superficie shadow-1">
      <div className="flex items-start justify-between gap-3 border-b border-borde px-5 py-4">
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-6 w-48 rounded-pastilla" />
          <Skeleton className="h-4 w-64 max-w-full rounded-pastilla" />
        </div>
        <Skeleton className="h-11 w-28" />
      </div>
      <div className="p-5">
        <ListRowsSkeleton rows={rows} />
      </div>
    </div>
  );
}
