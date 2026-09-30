import { IconLive } from "@/components/icons";
import { PanelPageHeader } from "@/components/panel-ui";
import { Skeleton, SkeletonScreen } from "@/components/skeleton";
import { Pill } from "@/components/ui";
import { ADMIN_PERIOD_TAB_LABELS } from "../_shared/period";
import { LineSkeleton, TabsSkeleton } from "../_shared/skeletons";
import { PeriodDataSkeleton } from "./period-data";

/**
 * Silueta del tablero del terminal: tasa en vivo, periodo, cifras, listas y
 * gráfico. Los textos fijos de la tarjeta en vivo (título, frase y "En vivo")
 * y las pestañas de periodo se pintan reales; solo las cifras van en barras.
 */
export default function TableroAdminLoading() {
  return (
    <SkeletonScreen label="Cargando el tablero del terminal…" className="flex flex-col gap-6">
      <PanelPageHeader
        title="Tablero del terminal"
        description="Lo que pasa en el terminal con todas las agencias: la tasa de salida cobrada, los viajes y los pasajeros nuevos."
      />

      <div
        aria-hidden="true"
        className="relative flex flex-col gap-4 overflow-hidden rounded-tarjeta border border-marca-200 bg-superficie p-5 shadow-1 sm:p-6"
      >
        <span className="absolute inset-x-0 top-0 h-1.5 bg-marca-600" />
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-lg font-semibold text-tinta">Tasa de salida cobrada</p>
            <p className="text-sm leading-snug text-tinta-suave">
              Últimas 24 horas, de todas las agencias. Se actualiza sola.
            </p>
          </div>
          <div className="shrink-0">
            <Pill tone="exito" icon={<IconLive />}>
              En vivo
            </Pill>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10 w-48 sm:h-12" />
          <Skeleton className="h-5 w-64 max-w-full rounded-pastilla" />
        </div>
        <div className="border-t border-borde pt-3">
          <Skeleton className="h-4 w-40 rounded-pastilla" />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <TabsSkeleton labels={ADMIN_PERIOD_TAB_LABELS} />
        <LineSkeleton />
      </div>

      <PeriodDataSkeleton />
    </SkeletonScreen>
  );
}
