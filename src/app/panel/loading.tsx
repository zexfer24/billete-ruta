import { Skeleton, SkeletonScreen } from "@/components/skeleton";
import { AttentionSkeleton, FiguresSkeleton, SectionSkeleton } from "./_dashboard/skeletons";

/**
 * Silueta del tablero del operador mientras llega la página (spec 6.5): la
 * cabecera con sus dos botones, "Lo que necesita tu atención", las cuatro
 * cifras, las salidas de hoy, la flota con los tickets y las dos secciones
 * plegadas. Los títulos fijos van reales; los datos, como bloques.
 */
export default function PanelLoading() {
  return (
    <SkeletonScreen label="Cargando el tablero…" className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 max-w-3xl flex-1 flex-col gap-3">
          <Skeleton className="h-9 w-72 max-w-full" />
          <Skeleton className="h-5 w-96 max-w-full rounded-pastilla" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-12 w-48" />
          <Skeleton className="h-12 w-52" />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-lg font-semibold text-tinta">Lo que necesita tu atención</p>
          <Skeleton className="h-11 w-52" />
        </div>
        <AttentionSkeleton />
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Skeleton className="h-6 w-40 rounded-pastilla" />
          <Skeleton className="h-[54px] w-72 max-w-full rounded-tarjeta" />
        </div>
        <FiguresSkeleton />
      </div>

      <SectionSkeleton rows={4} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionSkeleton rows={4} />
        <SectionSkeleton rows={4} />
      </div>

      <div className="flex flex-col gap-4">
        <Skeleton className="h-20 w-full rounded-tarjeta" />
        <Skeleton className="h-20 w-full rounded-tarjeta" />
      </div>
    </SkeletonScreen>
  );
}
