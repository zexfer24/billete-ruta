import { SkeletonScreen } from "@/components/skeleton";
import { SkeletonPageHeader, SkeletonTabs } from "../_shared/skeletons";
import { DeparturesListSkeleton } from "./departures-skeleton";

/** Silueta de la lista de salidas: cabecera con su botón, pestañas y grupos por día. */
export default function SalidasLoading() {
  return (
    <SkeletonScreen label="Cargando las salidas…" className="flex flex-col gap-6">
      <SkeletonPageHeader
        title="Salidas"
        description="Programa los viajes de tu agencia y abre cada uno para embarcar a los pasajeros."
        action="Crear salida"
      />
      <SkeletonTabs labels={["Próximas", "Historial"]} />
      <DeparturesListSkeleton />
    </SkeletonScreen>
  );
}
