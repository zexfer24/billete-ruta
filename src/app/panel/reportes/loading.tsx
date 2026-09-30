import { SkeletonScreen } from "@/components/skeleton";
import { SkeletonPageHeader, SkeletonPeriodChips, SkeletonTabs } from "../_shared/skeletons";
import { ReportDataSkeleton } from "./report-skeleton";

/** Silueta de reportes: cabecera, pestañas de tipo y de periodo, fechas plegadas, cifras y tabla. */
export default function ReportesLoading() {
  return (
    <SkeletonScreen label="Cargando el reporte…" className="flex flex-col gap-6">
      <SkeletonPageHeader
        title="Recaudación y movimientos"
        description="Cuánto cobró tu agencia en cada ruta y qué viajes hicieron tus choferes."
      />
      <SkeletonTabs labels={["Recaudación", "Viajes de choferes"]} />
      <SkeletonPeriodChips labels={["Últimas 24 h", "Hoy", "7 días", "30 días"]} extra="Otras fechas" />
      <ReportDataSkeleton vista="recaudacion" />
    </SkeletonScreen>
  );
}
