import { SkeletonTable, SkeletonTabs } from "../_shared/skeletons";
import type { FleetView } from "./fleet-body";

/**
 * Silueta del cuerpo de flota: pestañas y la tabla de la pestaña activa. El
 * resumen por estado no se dibuja porque solo aparece cuando hay unidades en
 * más de un estado. Sin `vista` (el `loading.tsx`, que no sabe si se entró
 * con `?vista=choferes`) ninguna pestaña va marcada y las cabeceras de la
 * tabla van como barras, para no mostrar las de vehículos y cambiarlas luego
 * por las de choferes. En el teléfono, cada tarjeta lleva el título con su
 * línea de datos, el viaje a todo el ancho y el enlace "Editar".
 */
export function FleetBodySkeleton({ vista }: { vista?: FleetView }) {
  return (
    <div aria-hidden="true" className="flex flex-col gap-6">
      <SkeletonTabs
        labels={["Vehículos", "Choferes"]}
        counts
        active={vista === undefined ? -1 : vista === "vehiculos" ? 0 : 1}
      />
      <div className="flex flex-col gap-4">
        <SkeletonTable
          columns={
            vista !== "choferes"
              ? ["Vehículo", "Puestos", "Estado", "Viaje en curso o próximo", ""]
              : ["Chofer", "Estado", "Viaje en curso o próximo", "Viajes completados", ""]
          }
          rows={6}
          headerBars={vista === undefined}
          cardDetails={0}
          cardWideDetail
          cardAction="enlace"
        />
      </div>
    </div>
  );
}
