import { Skeleton, SkeletonScreen } from "@/components/skeleton";
import { ListSkeleton } from "./skeletons";

/**
 * Silueta de "Pasajeros y pagos" mientras llega la página (spec 6.5): el
 * título real, los dos botones, las cinco pestañas, los filtros y la lista.
 */
export default function PasajerosLoading() {
  return (
    <SkeletonScreen label="Cargando pasajeros y pagos…" className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-3xl">
          <h1 className="text-2xl font-bold tracking-tight text-tinta sm:text-3xl">Pasajeros y pagos</h1>
          <p className="mt-1.5 text-base leading-relaxed text-tinta-suave">
            Revisa los comprobantes que envían los pasajeros, cobra lo que falta y consulta cada reserva.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-11 w-44" />
          <Skeleton className="h-11 w-56" />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex gap-1 overflow-hidden rounded-tarjeta border border-borde bg-superficie p-1 shadow-1">
          {["w-32", "w-32", "w-28", "w-28", "w-24"].map((width, i) => (
            <Skeleton key={i} className={`h-11 shrink-0 ${width}`} />
          ))}
        </div>
        <Skeleton className="h-5 w-96 max-w-full rounded-pastilla" />
      </div>

      <div className="flex flex-col gap-3 rounded-tarjeta border border-borde bg-superficie p-4 shadow-1 md:flex-row md:items-end">
        <div className="flex flex-col gap-1.5 md:w-80">
          <Skeleton className="h-4 w-14 rounded-pastilla" />
          <Skeleton className="h-11 w-full" />
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          <Skeleton className="h-4 w-16 rounded-pastilla" />
          <Skeleton className="h-11 w-full" />
        </div>
        <Skeleton className="h-11 w-28" />
      </div>

      <ListSkeleton />
    </SkeletonScreen>
  );
}
