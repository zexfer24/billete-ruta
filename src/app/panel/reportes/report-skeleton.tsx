import { Skeleton } from "@/components/skeleton";
import { SkeletonStatCards, SkeletonTable } from "../_shared/skeletons";
import type { ReportView } from "./range";

/** Silueta de los datos de un reporte: la línea del rango con su botón, tres cifras y la tabla. */
export function ReportDataSkeleton({ vista }: { vista: ReportView }) {
  return (
    <div aria-hidden="true" className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-5 w-full max-w-md rounded-pastilla" />
        <Skeleton className="h-11 w-full sm:w-56" />
      </div>
      <SkeletonStatCards count={3} />
      <SkeletonTable
        columns={
          vista === "recaudacion"
            ? ["Ruta", "Total cobrado", "Pagos", "Parte del total"]
            : ["Fecha", "Chofer y vehículo", "Ruta", "Salió", "Llegó", "Duración", "Pasajeros"]
        }
        rows={5}
        cardDetails={vista === "recaudacion" ? 2 : 4}
        cardAction={vista === "recaudacion"}
      />
    </div>
  );
}
