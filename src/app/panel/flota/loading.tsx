import { SkeletonScreen } from "@/components/skeleton";
import { SkeletonPageHeader } from "../_shared/skeletons";
import { FleetBodySkeleton } from "./fleet-skeleton";

/** Silueta de la flota: cabecera con su botón, pestañas, resumen y tabla de vehículos. */
export default function FlotaLoading() {
  return (
    <SkeletonScreen label="Cargando la flota…" className="flex flex-col gap-6">
      <SkeletonPageHeader
        title="Vehículos y choferes"
        description="Quién está en ruta, quién está libre y qué salidas vienen."
        action
      />
      <FleetBodySkeleton />
    </SkeletonScreen>
  );
}
