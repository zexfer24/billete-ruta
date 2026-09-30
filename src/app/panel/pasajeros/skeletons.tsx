import { Skeleton, SkeletonText } from "@/components/skeleton";

/**
 * Siluetas de carga de "Pasajeros y pagos" (spec 6.5), compartidas por
 * `loading.tsx` y por los `<Suspense>` de la lista y del panel lateral: misma
 * tabla en escritorio, mismas tarjetas en pantallas angostas.
 */

/** Silueta de la lista: línea de conteo y tabla (desde `xl`) o tarjetas, como `ResponsiveTable`. */
export function ListSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div aria-hidden="true" className="flex flex-col gap-4">
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
