import { Skeleton, SkeletonScreen } from "@/components/skeleton";
import {
  SkeletonPageHeader,
  SkeletonSectionCard,
  SkeletonStatCards,
  SkeletonTable,
} from "../../_shared/skeletons";

/** Silueta de la hoja de salida: cabecera, tres cifras, los pasos del viaje y la lista de pasajeros. */
export default function SalidaDetalleLoading() {
  return (
    <SkeletonScreen label="Cargando la salida…" className="flex flex-col gap-6">
      <SkeletonPageHeader back="Volver a salidas" badge />
      <SkeletonStatCards count={3} />

      <SkeletonSectionCard title="Pasos del viaje">
        <div className="flex flex-col gap-6">
          {[0, 1, 2].map((paso) => (
            <div key={paso} className="flex gap-4">
              <Skeleton className="size-10 rounded-full" />
              <div className="flex flex-1 flex-col gap-2 pt-1.5">
                <Skeleton className="h-5 w-48 rounded-pastilla" />
                <Skeleton className="h-4 w-36 rounded-pastilla" />
                {paso === 0 ? <Skeleton className="mt-1 h-12 w-full sm:w-52" /> : null}
              </div>
            </div>
          ))}
        </div>
      </SkeletonSectionCard>

      <SkeletonSectionCard title="Pasajeros">
        <SkeletonTable
          columns={["Pasajero", "Cédula", "Código del ticket", "Pago", "Abordaje"]}
          rows={6}
          cardDetails={3}
          cardAction={false}
        />
      </SkeletonSectionCard>
    </SkeletonScreen>
  );
}
