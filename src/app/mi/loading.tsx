import { Skeleton, SkeletonScreen } from "@/components/skeleton";
import { SkeletonNotice, SkeletonOtherTrip, SkeletonSectionTitle, SkeletonTicketCompact } from "./_components/skeletons";

/**
 * Silueta del inicio del pasajero en su caso más común con varios viajes: el
 * título, la reserva que apura con su línea de plazo y su botón, la sección
 * del viaje más cercano ("Tus otros viajes", con su enlace "Ver los N viajes")
 * y un aviso con el enlace "Ver todos los avisos". Con un viaje próximo la
 * página no muestra "Salen pronto", así que la silueta tampoco. El título de
 * la sección del otro viaje va como barra: cambia con el número de viajes.
 */
export default function MiInicioLoading() {
  return (
    <SkeletonScreen label="Cargando tu inicio…" className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-56 rounded-pastilla" />
        <SkeletonTicketCompact withDeadline />
        <Skeleton className="h-14 w-full rounded-pastilla" />
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex min-h-11 items-center justify-between gap-3">
          <Skeleton className="h-6 w-36 rounded-pastilla" />
          <Skeleton className="h-5 w-28 rounded-pastilla" />
        </div>
        <SkeletonOtherTrip />
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
