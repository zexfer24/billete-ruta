import { PanelPageHeader } from "@/components/panel-ui";
import { Skeleton, SkeletonScreen } from "@/components/skeleton";
import { SectionHeadingSkeleton } from "../_shared/skeletons";

const CARD = "rounded-tarjeta border border-borde bg-superficie shadow-1";

/** Valor vigente, campo con su ayuda, botón y las primeras líneas del historial. */
function RateBlockSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-40 rounded-pastilla" />
        <Skeleton className="h-9 w-36" />
        <Skeleton className="h-4 w-44 rounded-pastilla" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-4 w-64 max-w-full rounded-pastilla" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-4 w-56 max-w-full rounded-pastilla" />
      </div>
      <Skeleton className="h-11 w-full sm:w-44" />
    </div>
  );
}

function HistorySkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3 border-t border-borde pt-4">
      <Skeleton className="h-4 w-20 rounded-pastilla" />
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex justify-between gap-3">
          <Skeleton className="h-5 w-24 rounded-pastilla" />
          <Skeleton className="h-4 w-52 max-w-[50%] rounded-pastilla" />
        </div>
      ))}
    </div>
  );
}

/** Silueta de tasas: la tasa de salida y las dos tasas de cambio con su historial. */
export default function TasasAdminLoading() {
  return (
    <SkeletonScreen label="Cargando las tasas…" className="flex flex-col gap-6">
      <PanelPageHeader
        title="Tasas y precios"
        description="La tasa de salida que paga cada pasajero y las tasas de cambio para cobrar en bolívares y en pesos. Un cambio solo aplica a las reservas nuevas: las que ya existen mantienen su precio."
      />

      <div className={CARD}>
        <div className="border-b border-borde px-5 py-4">
          <SectionHeadingSkeleton />
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-40 rounded-pastilla" />
              <Skeleton className="h-9 w-32" />
              <Skeleton className="h-4 w-44 rounded-pastilla" />
            </div>
            <div className="flex flex-col gap-3">
              <Skeleton className="h-4 w-72 max-w-full rounded-pastilla" />
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-11 w-full sm:w-44" />
            </div>
          </div>
          <div className="mt-6">
            <HistorySkeleton />
          </div>
        </div>
      </div>

      <div className={CARD}>
        <div className="border-b border-borde px-5 py-4">
          <SectionHeadingSkeleton />
        </div>
        <div className="grid grid-cols-1 gap-8 p-5 lg:grid-cols-2 lg:gap-6">
          {[0, 1].map((index) => (
            <div key={index} className="flex flex-col gap-5 rounded-control border border-borde p-4">
              <Skeleton className="h-5 w-32 rounded-pastilla" />
              <RateBlockSkeleton />
              <HistorySkeleton />
            </div>
          ))}
        </div>
      </div>
    </SkeletonScreen>
  );
}
