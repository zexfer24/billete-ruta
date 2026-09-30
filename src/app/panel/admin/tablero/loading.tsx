import { PanelPageHeader } from "@/components/panel-ui";
import { Skeleton, SkeletonScreen } from "@/components/skeleton";
import { LineSkeleton, TabsSkeleton } from "../_shared/skeletons";
import { PeriodDataSkeleton } from "./period-data";

/** Silueta del tablero del terminal: tasa en vivo, periodo, cifras, listas y gráfico. */
export default function TableroAdminLoading() {
  return (
    <SkeletonScreen label="Cargando el tablero del terminal…" className="flex flex-col gap-6">
      <PanelPageHeader
        title="Tablero del terminal"
        description="Lo que pasa en el terminal con todas las agencias: la tasa de salida cobrada, los viajes y los pasajeros nuevos."
      />

      <div className="relative flex flex-col gap-4 overflow-hidden rounded-tarjeta border border-marca-200 bg-superficie p-5 shadow-1 sm:p-6">
        <span className="absolute inset-x-0 top-0 h-1.5 bg-marca-600" aria-hidden="true" />
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-6 w-56 rounded-pastilla" />
            <Skeleton className="h-4 w-72 max-w-full rounded-pastilla" />
          </div>
          <Skeleton className="h-7 w-24 rounded-pastilla" />
        </div>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-11 w-48 sm:h-14" />
          <Skeleton className="h-5 w-64 max-w-full rounded-pastilla" />
        </div>
        <div className="border-t border-borde pt-3">
          <Skeleton className="h-4 w-40 rounded-pastilla" />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <TabsSkeleton />
        <LineSkeleton />
      </div>

      <PeriodDataSkeleton />
    </SkeletonScreen>
  );
}
