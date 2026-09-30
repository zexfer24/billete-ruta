import { IconDownload } from "@/components/icons";
import { PanelPageHeader, panelButtonClass } from "@/components/panel-ui";
import { SkeletonScreen } from "@/components/skeleton";
import { ADMIN_PERIOD_TAB_LABELS } from "../_shared/period";
import { FilterCardSkeleton, LineSkeleton, TabsSkeleton } from "../_shared/skeletons";
import { MovementsListSkeleton } from "./movements-list";

/** Silueta de movimientos: periodo, filtro de agencia y la tabla de viajes. */
export default function MovimientosAdminLoading() {
  return (
    <SkeletonScreen label="Cargando los movimientos…" className="flex flex-col gap-6">
      <PanelPageHeader
        title="Movimientos de las agencias"
        description="Cada viaje de las agencias del terminal: cuándo embarcó, salió y llegó, y cuántos pasajeros llevó. Toca un viaje para ver quién iba a bordo."
        actions={
          <span aria-hidden="true" className={panelButtonClass("secundario")}>
            <IconDownload className="size-5 shrink-0" />
            Descargar en Excel (CSV)
          </span>
        }
      />
      <div className="flex flex-col gap-3">
        <TabsSkeleton labels={ADMIN_PERIOD_TAB_LABELS} />
        <FilterCardSkeleton labels={["Agencia"]} button="Aplicar filtros" />
        <LineSkeleton />
      </div>
      <MovementsListSkeleton />
    </SkeletonScreen>
  );
}
