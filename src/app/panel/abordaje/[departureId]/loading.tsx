import { IconArrowLeft } from "@/components/icons";
import { Skeleton, SkeletonScreen } from "@/components/skeleton";

/** Silueta del escáner de abordaje: volver, título, avance y la tarjeta de búsqueda. */
export default function AbordajeLoading() {
  return (
    <SkeletonScreen label="Cargando el abordaje…" className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <div className="flex flex-col gap-3">
        <span className="-ml-2 inline-flex min-h-11 w-fit items-center gap-1.5 px-2 text-[15px] font-semibold text-marca-700">
          <IconArrowLeft className="size-5 shrink-0" />
          Volver a la salida
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-tinta sm:text-3xl">Abordaje</h1>
          <Skeleton className="mt-2.5 h-5 w-4/5 rounded-pastilla" />
        </div>
      </div>

      <div className="flex flex-col gap-2.5 rounded-tarjeta border border-borde bg-superficie p-5 shadow-1">
        <div className="flex justify-between gap-3">
          <Skeleton className="h-4 w-44 rounded-pastilla" />
          <Skeleton className="h-4 w-20 rounded-pastilla" />
        </div>
        <Skeleton className="h-2 w-full rounded-pastilla" />
      </div>

      <div className="flex flex-col gap-4 rounded-tarjeta border border-borde bg-superficie p-5 shadow-1">
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-4 w-32 rounded-pastilla" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-4 w-3/4 rounded-pastilla" />
        </div>
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    </SkeletonScreen>
  );
}
