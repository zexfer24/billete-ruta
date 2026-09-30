import { Skeleton, SkeletonCircle, SkeletonScreen } from "@/components/skeleton";
import { SkeletonCard, SkeletonSectionTitle, SkeletonTicketLarge } from "../../_components/skeletons";

/**
 * Silueta del detalle de un viaje: volver, título y subtítulo, ticket grande,
 * tarjeta de pago con la cifra y los campos, datos del viaje y quiénes viajan.
 */
export default function DetalleReservaLoading() {
  return (
    <SkeletonScreen label="Cargando tu viaje…" className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-11 w-32 rounded-pastilla" />
        <Skeleton className="h-8 w-3/5 rounded-pastilla" />
        <Skeleton className="h-5 w-4/5 rounded-pastilla" />
      </div>
      <SkeletonTicketLarge />
      <SkeletonCard className="flex flex-col gap-4">
        <Skeleton className="h-6 w-40 rounded-pastilla" />
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-4 w-16 rounded-pastilla" />
          <Skeleton className="h-9 w-36 rounded-pastilla" />
        </div>
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-14 w-full rounded-pastilla" />
      </SkeletonCard>
      <SkeletonCard className="flex flex-col gap-4">
        <SkeletonSectionTitle>Datos del viaje</SkeletonSectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map((indice) => (
            <div key={indice} className="flex flex-col gap-1.5">
              <Skeleton className="h-4 w-24 rounded-pastilla" />
              <Skeleton className="h-5 w-40 rounded-pastilla" />
            </div>
          ))}
        </div>
      </SkeletonCard>
      <div className="flex flex-col gap-3">
        <SkeletonSectionTitle>Quiénes viajan</SkeletonSectionTitle>
        {[0, 1].map((indice) => (
          <div
            key={indice}
            aria-hidden="true"
            className="flex items-center gap-3 rounded-tarjeta border border-borde bg-superficie p-4 shadow-1"
          >
            <SkeletonCircle className="size-9" />
            <Skeleton className="h-5 w-1/2 rounded-pastilla" />
          </div>
        ))}
      </div>
    </SkeletonScreen>
  );
}
