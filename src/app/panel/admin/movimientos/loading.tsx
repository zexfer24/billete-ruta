import { IconDownload } from "@/components/icons";
import { SkeletonScreen } from "@/components/skeleton";
import { ADMIN_PERIOD_TAB_LABELS } from "../_shared/period";
import { ButtonSkeleton, FilterCardSkeleton, LineSkeleton, PageHeaderSkeleton, TabsSkeleton } from "../_shared/skeletons";
import { MovementsListSkeleton } from "./movements-list";

/** Silueta de movimientos: periodo, filtro de agencia y la tabla de viajes. */
export default function MovimientosAdminLoading() {
  return (
    <SkeletonScreen label="Cargando los movimientos…" className="flex flex-col gap-6">
      <PageHeaderSkeleton
        title="Movimientos de las agencias"
        description="Cada viaje de las agencias del terminal: cuándo embarcó, salió y llegó, y cuántos pasajeros llevó. Toca un viaje para ver quién iba a bordo."
        actions={
          <ButtonSkeleton>
            <IconDownload className="size-5 shrink-0" />
            Descargar en Excel (CSV)
          </ButtonSkeleton>
        }
      />
      <div className="flex flex-col gap-3">
        <TabsSkeleton labels={ADMIN_PERIOD_TAB_LABELS} grid />
        <FilterCardSkeleton labels={["Agencia"]} />
        <LineSkeleton />
      </div>
      <MovementsListSkeleton />
    </SkeletonScreen>
  );
}
