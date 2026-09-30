import { Skeleton } from "@/components/skeleton";
import { SkeletonTable, SkeletonTabs } from "../_shared/skeletons";
import type { FleetView } from "./fleet-body";

/** Silueta del cuerpo de flota: pestañas, resumen por estado y la tabla de la pestaña activa. */
export function FleetBodySkeleton({ vista }: { vista: FleetView }) {
  return (
    <div aria-hidden="true" className="flex flex-col gap-6">
      <SkeletonTabs labels={["Vehículos", "Choferes"]} active={vista === "vehiculos" ? 0 : 1} />
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-4 w-36 rounded-pastilla" />
          <Skeleton className="h-7 w-28 rounded-pastilla" />
          <Skeleton className="h-7 w-32 rounded-pastilla" />
          <Skeleton className="h-7 w-24 rounded-pastilla" />
        </div>
        <SkeletonTable
          columns={
            vista === "vehiculos"
              ? ["Vehículo", "Puestos", "Estado", "Viaje en curso o próximo", ""]
              : ["Chofer", "Estado", "Viaje en curso o próximo", "Viajes completados", ""]
          }
          rows={6}
        />
      </div>
    </div>
  );
}
