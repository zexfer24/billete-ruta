import { Skeleton, SkeletonScreen } from "@/components/skeleton";
import { SkeletonNotice, SkeletonSectionTitle, SkeletonTicketCompact } from "./_components/skeletons";

/**
 * Silueta del inicio del pasajero en su caso más común: título, próximo viaje
 * con su botón y la línea "Tienes N viajes próximos", y un aviso con el
 * enlace "Ver todos los avisos". Con un viaje próximo la página no muestra
 * "Salen pronto", así que la silueta tampoco.
 */
export default function MiInicioLoading() {
  return (
    <SkeletonScreen label="Cargando tu inicio…" className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-56 rounded-pastilla" />
        <SkeletonTicketCompact />
        <Skeleton className="h-14 w-full rounded-pastilla" />
        <div className="flex min-h-11 items-center justify-center">
          <Skeleton className="h-5 w-3/5 rounded-pastilla" />
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex min-h-11 items-center justify-between gap-3">
          <SkeletonSectionTitle>Avisos</SkeletonSectionTitle>
          <Skeleton className="h-5 w-28 rounded-pastilla" />
        </div>
        <SkeletonNotice />
      </div>
    </SkeletonScreen>
  );
}
