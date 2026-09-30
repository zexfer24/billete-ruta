import { Skeleton, SkeletonCircle, SkeletonScreen, SkeletonText } from "@/components/skeleton";
import {
  SkeletonNotice,
  SkeletonPageTitle,
  SkeletonSectionTitle,
} from "../_components/skeletons";

/** Silueta de Avisos: título, dos avisos por hacer y tres mensajes de un día. */
export default function AvisosLoading() {
  return (
    <SkeletonScreen label="Cargando tus avisos…" className="flex flex-col gap-8">
      <SkeletonPageTitle subtitle="Lo que pasa con tus viajes y tu cuenta, y los mensajes que te enviamos.">
        Avisos
      </SkeletonPageTitle>
      <div className="flex flex-col gap-3">
        <SkeletonSectionTitle>Lo importante ahora</SkeletonSectionTitle>
        <SkeletonNotice />
        <SkeletonNotice />
      </div>
      <div className="flex flex-col gap-3">
        <SkeletonSectionTitle>Mensajes que te enviamos</SkeletonSectionTitle>
        <Skeleton className="h-5 w-16 rounded-pastilla" />
        {[0, 1, 2].map((indice) => (
          <div
            key={indice}
            aria-hidden="true"
            className="flex gap-3 rounded-tarjeta border border-borde bg-superficie p-4 shadow-1"
          >
            <SkeletonCircle className="size-10" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-12 rounded-pastilla" />
              <SkeletonText lines={2} />
            </div>
          </div>
        ))}
      </div>
    </SkeletonScreen>
  );
}
