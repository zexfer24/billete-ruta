import { IconDownload } from "@/components/icons";
import { panelButtonClass } from "@/components/panel-ui";
import { SkeletonScreen } from "@/components/skeleton";
import { ADMIN_PERIOD_TAB_LABELS } from "../_shared/period";
import { FILTER_BUTTON_LABEL } from "../_shared/period-filter";
import { FilterCardSkeleton, LineSkeleton, PageHeaderSkeleton, TabsSkeleton } from "../_shared/skeletons";
import { MovementsListSkeleton } from "./movements-list";

/** Silueta de movimientos: periodo, filtro de agencia y la tabla de viajes. */
export default function MovimientosAdminLoading() {
  return (
    <SkeletonScreen label="Cargando los movimientos…" className="flex flex-col gap-6">
      <PageHeaderSkeleton
        title="Movimientos de las agencias"
        description="Cada viaje de las agencias del terminal: cuándo embarcó, salió y llegó, y cuántos pasajeros llevó. Toca un viaje para ver quién iba a bordo."
        actions={
          <span className={panelButtonClass("secundario")}>
            <IconDownload className="size-5 shrink-0" />
            Descargar en Excel (CSV)
          </span>
        }
      />
      <div className="flex flex-col gap-3">
        <TabsSkeleton labels={ADMIN_PERIOD_TAB_LABELS} grid />
        <FilterCardSkeleton labels={["Agencia"]} button={FILTER_BUTTON_LABEL} />
        <LineSkeleton />
      </div>
      <MovementsListSkeleton />
    </SkeletonScreen>
  );
}
