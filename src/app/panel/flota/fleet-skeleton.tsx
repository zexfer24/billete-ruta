import { SkeletonTable, SkeletonTabs } from "../_shared/skeletons";
import type { FleetView } from "./fleet-body";

/**
 * Silueta del cuerpo de flota: pestañas y la tabla de la pestaña activa. El
 * resumen por estado no se dibuja porque solo aparece cuando hay unidades en
 * más de un estado.
 */
export function FleetBodySkeleton({ vista }: { vista: FleetView }) {
  return (
    <div aria-hidden="true" className="flex flex-col gap-6">
      <SkeletonTabs labels={["Vehículos", "Choferes"]} active={vista === "vehiculos" ? 0 : 1} />
      <div className="flex flex-col gap-4">
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
