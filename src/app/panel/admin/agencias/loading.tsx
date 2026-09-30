import { PanelPageHeader } from "@/components/panel-ui";
import { Skeleton, SkeletonScreen } from "@/components/skeleton";
import { LineSkeleton, TableSkeleton } from "../_shared/skeletons";

/** Silueta de agencias: el total y la tabla de agencias con su acción. */
export default function AgenciasAdminLoading() {
  return (
    <SkeletonScreen label="Cargando las agencias…" className="flex flex-col gap-6">
      <PanelPageHeader
        title="Agencias del terminal"
        description="Las agencias que venden pasajes en el terminal, con su flota y su personal. Aquí registras una agencia nueva o la desactivas."
        actions={<Skeleton className="h-11 w-44" />}
      />
      <div className="flex flex-col gap-3">
        <LineSkeleton className="w-60" />
        <TableSkeleton rows={4} columns={6} mobileCards={3} />
      </div>
    </SkeletonScreen>
  );
}
