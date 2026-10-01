import { Skeleton, SkeletonScreen } from "@/components/skeleton";
import { panelButtonClass } from "@/components/panel-ui";
import { IconCash, IconRefresh, IconStore } from "@/components/icons";
import { DASHBOARD_PERIODS, DASHBOARD_PERIOD_LABELS } from "@/lib/time";
import { SkeletonTabs } from "@/app/panel/_shared/skeletons";
import {
  AttentionSkeleton,
  CollapsibleSkeleton,
  FiguresSkeleton,
  SectionSkeleton,
  TripsTodaySkeleton,
} from "@/app/panel/_dashboard/skeletons";
import {
  ACTIVITY_TITLE,
  FLEET_SECTION,
  QUICK_REGISTER_SECTION,
} from "@/app/panel/_dashboard/section-texts";

/**
 * Silueta del tablero del operador mientras llega la página (spec 6.5). Los
 * textos fijos se pintan reales: los dos botones de la cabecera, las pestañas
 * del periodo, los títulos de sección y las dos secciones plegadas. Lo que
 * depende de la persona o del periodo elegido (el nombre de la agencia, el
 * saludo, "Resumen de…", la pestaña activa y la descripción de "Tickets
 * nuevos") va en barra: este archivo no recibe los `searchParams` y marcaría
 * mal el periodo al entrar directo a `/panel?periodo=7d`.
 */
export default function TableroLoading() {
  return (
    <SkeletonScreen label="Cargando el tablero…" className="flex flex-col gap-8">
      <div aria-hidden="true" className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 max-w-3xl flex-1 flex-col gap-3">
          <Skeleton className="h-9 w-72 max-w-full" />
          <Skeleton className="h-5 w-96 max-w-full rounded-pastilla" />
        </div>
        <div className="flex min-w-0 max-w-full flex-wrap gap-2">
          <span className={panelButtonClass("primario", "lg")}>
            <IconStore className="size-5" />
            Vender un pasaje
          </span>
          <span className={panelButtonClass("secundario", "lg")}>
            <IconCash className="size-5" />
            Registrar un cobro
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div aria-hidden="true" className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <p className="text-lg font-semibold text-tinta">Lo que necesita tu atención</p>
          {/* `div` y no `p`: `Skeleton` es un `div`, que no puede ir dentro de un párrafo. */}
          <div className="flex flex-wrap items-center gap-x-2 text-sm text-tinta-suave">
            <Skeleton className="h-4 w-28 rounded-pastilla" />
            <span className="inline-flex min-h-11 items-center gap-1.5 px-2 font-semibold text-marca-700">
              <IconRefresh className="size-4" />
              Actualizar
            </span>
          </div>
        </div>
        <AttentionSkeleton />
      </div>

      <div className="flex flex-col gap-4">
        <div aria-hidden="true" className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <Skeleton className="h-6 w-40 rounded-pastilla" />
          <SkeletonTabs labels={DASHBOARD_PERIODS.map((p) => DASHBOARD_PERIOD_LABELS[p])} active={-1} />
        </div>
        <FiguresSkeleton />
      </div>

      <TripsTodaySkeleton />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <SectionSkeleton rows={4} {...FLEET_SECTION} />
        <SectionSkeleton rows={4} title="Tickets nuevos" actionLabel="Ver todos" />
      </div>

      <div className="flex flex-col gap-4">
        <CollapsibleSkeleton title={ACTIVITY_TITLE} description="Ventas, cobros y embarques de tu agencia." />
        <CollapsibleSkeleton title={QUICK_REGISTER_SECTION.title} description={QUICK_REGISTER_SECTION.description} />
      </div>
    </SkeletonScreen>
  );
}
