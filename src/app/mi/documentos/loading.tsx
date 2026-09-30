import { Skeleton, SkeletonCircle, SkeletonScreen, SkeletonText } from "@/components/skeleton";
import { SkeletonCard, SkeletonPageTitle } from "../_components/skeletons";

/**
 * Tarjeta de un documento: icono, título con estado y frase; debajo, la zona
 * de la foto con su botón o, si el formulario va plegado (el permiso, que es
 * opcional), solo el botón que lo despliega.
 */
function DocumentoCardSkeleton({ titulo, plegado = false }: { titulo: string; plegado?: boolean }) {
  return (
    <SkeletonCard className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <SkeletonCircle className="size-10" />
        <div className="flex flex-1 flex-col gap-2">
          <div className="flex items-center gap-3">
            <p className="text-lg font-semibold text-tinta">{titulo}</p>
            <Skeleton className="h-6 w-20 rounded-pastilla" />
          </div>
          <SkeletonText lines={2} />
        </div>
      </div>
      {plegado ? null : (
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-4 w-28 rounded-pastilla" />
          <Skeleton className="h-18 w-full" />
          <Skeleton className="h-4 w-4/5 rounded-pastilla" />
        </div>
      )}
      <Skeleton className="h-12 w-full rounded-pastilla" />
    </SkeletonCard>
  );
}

/** Silueta de Mis documentos: título, las dos tarjetas de documento y la nota de privacidad. */
export default function DocumentosLoading() {
  return (
    <SkeletonScreen label="Cargando tus documentos…" className="flex flex-col gap-6">
      <SkeletonPageTitle subtitle="Para reservar necesitas la foto de tu cédula. Si viaja un menor de edad, también su permiso de viaje.">
        Mis documentos
      </SkeletonPageTitle>
      <DocumentoCardSkeleton titulo="Foto de tu cédula" />
      <DocumentoCardSkeleton titulo="Permiso de viaje" plegado />
      <Skeleton className="h-4 w-4/5 rounded-pastilla" />
    </SkeletonScreen>
  );
}
