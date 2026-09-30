import { PanelPageHeader } from "@/components/panel-ui";
import { Skeleton, SkeletonScreen } from "@/components/skeleton";
import { FilterCardSkeleton, LineSkeleton, TableSkeleton, TabsSkeleton } from "../_shared/skeletons";

/** Silueta de movimientos: periodo, filtro de agencia y la tabla de viajes. */
export default function MovimientosAdminLoading() {
  return (
    <SkeletonScreen label="Cargando los movimientos…" className="flex flex-col gap-6">
      <PanelPageHeader
        title="Movimientos de las agencias"
        description="Cada viaje de las agencias del terminal: cuándo embarcó, salió y llegó, y cuántos pasajeros llevó. Toca un viaje para ver quién iba a bordo."
        actions={<Skeleton className="h-11 w-60" />}
      />
      <div className="flex flex-col gap-3">
        <TabsSkeleton />
        <FilterCardSkeleton fields={1} />
        <LineSkeleton />
      </div>
      <TableSkeleton rows={8} columns={8} />
    </SkeletonScreen>
  );
}
