import { Skeleton } from "@/components/skeleton";
import { IconBus, IconCash, IconChart, IconClock, IconUsers } from "@/components/icons";
import { SkeletonStatCards, SkeletonTable } from "../_shared/skeletons";
import type { ReportView } from "./range";

/**
 * Silueta de los datos de un reporte: la línea del rango con su botón, las
 * cifras (en el teléfono, la tarjeta compacta de `CompactFigures`) y la tabla.
 */
export function ReportDataSkeleton({ vista }: { vista: ReportView }) {
  return (
    <div aria-hidden="true" className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-4 w-full max-w-md rounded-pastilla" />
        <Skeleton className="h-11 w-56" />
      </div>
      <SkeletonStatCards
        compact
        stats={
          vista === "recaudacion"
            ? [
                { label: "Recaudado", icon: <IconCash /> },
                { label: "Pagos recibidos", icon: <IconChart /> },
              ]
            : [
                { label: "Viajes", icon: <IconBus /> },
                { label: "Pasajeros transportados", compactLabel: "Pasajeros", icon: <IconUsers /> },
                { label: "Duración promedio", icon: <IconClock />, compactWide: true },
              ]
        }
      />
      <SkeletonTable
        columns={
          vista === "recaudacion"
            ? ["Ruta", "Recaudado", "Pagos", "Parte del total"]
            : ["Fecha", "Chofer y vehículo", "Ruta", "Salió", "Llegó", "Duración", "Pasajeros"]
        }
        rows={5}
        cardDetails={vista === "recaudacion" ? 2 : 4}
        // La tarjeta de recaudación termina en "N % del total" y su barra, no
        // en un botón; la de viajes no lleva pie.
        cardAction={vista === "recaudacion" ? "barra" : false}
      />
    </div>
  );
}
