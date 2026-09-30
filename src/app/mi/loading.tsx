import { Skeleton, SkeletonScreen } from "@/components/skeleton";
import { DepartureBoardSkeleton } from "@/components/departure-board";
import {
  SkeletonNotice,
  SkeletonSectionTitle,
  SkeletonTicketCompact,
} from "./_components/skeletons";

/** Silueta del inicio del pasajero: título, próximo viaje con su botón, un aviso y las salidas. */
export default function MiInicioLoading() {
  return (
    <SkeletonScreen label="Cargando tu inicio…" className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-56 rounded-pastilla" />
        <SkeletonTicketCompact />
        <Skeleton className="h-14 w-full rounded-pastilla" />
      </div>
      <div className="flex flex-col gap-3">
        <SkeletonSectionTitle>Avisos</SkeletonSectionTitle>
        <SkeletonNotice />
      </div>
      <div className="flex flex-col gap-3">
        <SkeletonSectionTitle>Salen pronto</SkeletonSectionTitle>
        <DepartureBoardSkeleton rows={4} />
      </div>
    </SkeletonScreen>
  );
}
