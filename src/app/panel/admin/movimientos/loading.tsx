import { PANEL_LABEL_CLASS } from "@/components/panel-ui";
import { SkeletonScreen } from "@/components/skeleton";
import { ADMIN_PERIOD_TAB_LABELS } from "../_shared/period";
import { InputSkeleton, LineSkeleton, PageHeaderSkeleton, TabsSkeleton } from "../_shared/skeletons";
import { ADMIN_TABS_BESIDE_TITLE_CLASS } from "../_shared/tab-classes";
import { MovementsListSkeleton } from "./movements-list";

/**
 * Silueta de movimientos: la barra de periodo y agencia (como `PeriodFilter`
 * con `autoSubmit`), el rango y la tabla de viajes con su descarga.
 */
export default function MovimientosAdminLoading() {
  return (
    <SkeletonScreen label="Cargando los movimientos…" className="flex flex-col gap-6">
      <PageHeaderSkeleton
        title="Movimientos de las agencias"
        description="Cada viaje de las agencias del terminal: cuándo embarcó, salió y llegó, y cuántos pasajeros llevó. Toca un viaje para ver quién iba a bordo."
      />
      <div className="flex flex-col gap-3">
        <div aria-hidden="true" className="flex flex-wrap items-end justify-between gap-3">
          <div className={ADMIN_TABS_BESIDE_TITLE_CLASS}>
            <TabsSkeleton labels={ADMIN_PERIOD_TAB_LABELS} grid />
          </div>
          <div className="flex w-full flex-col gap-1.5 sm:w-64">
            <p className={PANEL_LABEL_CLASS}>Agencia</p>
            <InputSkeleton />
          </div>
        </div>
        <LineSkeleton />
      </div>
      <MovementsListSkeleton />
    </SkeletonScreen>
  );
}
