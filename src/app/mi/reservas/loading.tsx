import { Skeleton, SkeletonScreen } from "@/components/skeleton";
import { SkeletonPageTitle, SkeletonTicketCompact } from "../_components/skeletons";

/** Silueta de Mis viajes: título, control de dos opciones y tres tickets compactos. */
export default function MisReservasLoading() {
  return (
    <SkeletonScreen label="Cargando tus viajes…" className="flex flex-col gap-6">
      <SkeletonPageTitle>Mis viajes</SkeletonPageTitle>
      <div
        aria-hidden="true"
        className="flex gap-1 rounded-pastilla border border-borde bg-superficie p-1 shadow-1"
      >
        <Skeleton className="h-11 flex-1 rounded-pastilla" />
        <div className="h-11 flex-1" />
      </div>
      <div className="flex flex-col gap-4">
        <SkeletonTicketCompact withAction />
        <SkeletonTicketCompact withAction />
        <SkeletonTicketCompact withAction />
      </div>
    </SkeletonScreen>
  );
}
