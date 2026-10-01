import { Skeleton, SkeletonButton, SkeletonScreen } from "@/components/skeleton";
import { IconCash, IconRefresh, IconStore } from "@/components/icons";
import { DASHBOARD_PERIODS, DASHBOARD_PERIOD_LABELS } from "@/lib/time";
import { PERIOD_CHIP_CLASS, PERIOD_CHIP_IDLE_CLASS, PERIOD_CHIP_LIST_CLASS } from "@/app/panel/_shared/period-chips";
import { cx } from "@/components/ui-classes";
import {
  AttentionSkeleton,
  CollapsibleSkeleton,
  FiguresSkeleton,
  FleetSkeleton,
  PendingNowSkeleton,
  TicketsSkeleton,
  TripsTodaySkeleton,
} from "@/app/panel/_dashboard/skeletons";
import { ACTIVITY_TITLE, QUICK_REGISTER_SECTION } from "@/app/panel/_dashboard/section-texts";

/**
 * Silueta del tablero del operador mientras llega la página (spec 6.5). Los
 * textos fijos se pintan reales: los dos botones de la cabecera, las pastillas
 * del periodo, los títulos de sección y las dos secciones plegadas. Lo que
 * depende de la persona o del periodo elegido (el nombre de la agencia, el
 * saludo, "Resumen de…", la pastilla elegida y las descripciones de "Tickets
 * nuevos" y "Actividad reciente") va en barra: este archivo no recibe los `searchParams` y marcaría
 * mal el periodo al entrar directo a `/panel?periodo=7d`.
 *
 * Los botones van quietos (`SkeletonButton`: brillo de carga en vez del
 * relleno morado o del borde) y «Actualizar» en tinta-suave en vez de morado:
 * se lee qué harán, pero nadie los pulsa creyendo que ya responden.
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
          <SkeletonButton size="lg" className="w-full sm:w-auto">
            <IconStore className="size-5" />
            Vender un pasaje
          </SkeletonButton>
          <SkeletonButton size="lg" className="w-full sm:w-auto">
            <IconCash className="size-5" />
            Registrar un cobro
          </SkeletonButton>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div aria-hidden="true" className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <p className="text-lg font-semibold text-tinta">Lo que necesita tu atención</p>
          {/* `div` y no `p`: `Skeleton` es un `div`, que no puede ir dentro de un párrafo. */}
          <div className="flex flex-wrap items-center gap-x-2 text-sm text-tinta-suave">
            <Skeleton className="h-4 w-28 rounded-pastilla" />
            <span className="inline-flex min-h-11 select-none items-center gap-1.5 px-2 font-semibold text-tinta-suave">
              <IconRefresh className="size-4" />
              Actualizar
            </span>
          </div>
        </div>
        <AttentionSkeleton />
        <PendingNowSkeleton />
      </div>

      <div className="flex flex-col gap-4">
        <div aria-hidden="true" className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <Skeleton className="h-6 w-40 rounded-pastilla" />
          {/* Las pastillas de `PeriodChips` con sus mismas clases: una fila de
              tres en el teléfono y su ancho natural desde `sm`. Ninguna va
              elegida: este archivo no conoce `?periodo=`. */}
          <div className="w-full sm:w-auto">
            <div className={PERIOD_CHIP_LIST_CLASS}>
              {DASHBOARD_PERIODS.map((p) => (
                <span
                  key={p}
                  className={cx(PERIOD_CHIP_CLASS, PERIOD_CHIP_IDLE_CLASS, "w-full justify-center sm:w-auto sm:justify-start")}
                >
                  {DASHBOARD_PERIOD_LABELS[p]}
                </span>
              ))}
            </div>
          </div>
        </div>
        <FiguresSkeleton />
      </div>

      <TripsTodaySkeleton />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <FleetSkeleton />
        <TicketsSkeleton />
      </div>

      <div className="flex flex-col gap-4">
        {/* Sin descripción: la real depende del periodo ("…de hoy"), que este archivo no conoce. */}
        <CollapsibleSkeleton title={ACTIVITY_TITLE} />
        <CollapsibleSkeleton title={QUICK_REGISTER_SECTION.title} description={QUICK_REGISTER_SECTION.description} />
      </div>
    </SkeletonScreen>
  );
}
