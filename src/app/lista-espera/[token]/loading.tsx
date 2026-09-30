import { DepartureBoardSkeleton } from "@/components/departure-board";
import { Skeleton, SkeletonScreen, SkeletonText } from "@/components/skeleton";
import { Card } from "@/components/ui";
import { PrimaryButtonSkeleton } from "../../_publico/form-skeleton";
import { PublicShell } from "../../_publico/public-shell";

/**
 * Silueta de la lista de espera (spec 6.5): el logo se pinta real; la tarjeta
 * reproduce el estado vigente, que es el más largo: pastilla de estado,
 * título, explicación, aviso del plazo, tarjeta de la salida, puestos
 * guardados y botón principal.
 */
export default function ListaEsperaLoading() {
  return (
    <SkeletonScreen label="Cargando tu aviso de lista de espera…">
      <PublicShell>
        <Card className="flex flex-col gap-5 sm:p-6">
          <div aria-hidden="true" className="flex flex-col gap-2">
            <Skeleton className="h-7 w-40 rounded-pastilla" />
            <Skeleton className="h-8 w-11/12 rounded-pastilla" />
            <SkeletonText lines={2} />
          </div>
          <Skeleton className="h-24 w-full" />
          <DepartureBoardSkeleton rows={1} />
          <Skeleton className="h-6 w-3/5 rounded-pastilla" />
          <PrimaryButtonSkeleton />
        </Card>
      </PublicShell>
    </SkeletonScreen>
  );
}
