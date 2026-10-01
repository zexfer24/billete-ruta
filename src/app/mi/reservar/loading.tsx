import { Skeleton, SkeletonScreen } from "@/components/skeleton";
import { Stepper } from "@/components/stepper";
import { SkeletonPageTitle } from "../_components/skeletons";

/** Tarjeta de salida del paso 1: destino, origen y agencia, precio y puestos, y la hora con "Elegir". */
function DepartureOptionSkeleton() {
  return (
    <div aria-hidden="true" className="rounded-tarjeta border border-borde bg-superficie p-4 shadow-1">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-2 pt-1">
          <Skeleton className="h-5 w-2/5 rounded-pastilla" />
          <Skeleton className="h-4 w-1/3 rounded-pastilla" />
          <Skeleton className="h-4 w-1/2 rounded-pastilla" />
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5 pt-1">
          <Skeleton className="h-5 w-20 rounded-pastilla" />
          <Skeleton className="h-4 w-24 rounded-pastilla" />
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <Skeleton className="h-5 w-40 rounded-pastilla" />
        <Skeleton className="h-5 w-16 rounded-pastilla" />
      </div>
    </div>
  );
}

/**
 * Silueta del asistente de reserva en su primer paso: título, pasos reales,
 * buscador morado, pastillas de días, el título del día con la nota del
 * precio y cuatro salidas.
 */
export default function ReservarLoading() {
  return (
    <SkeletonScreen label="Cargando las salidas…" className="flex flex-col gap-6">
      <SkeletonPageTitle>Reservar un viaje</SkeletonPageTitle>
      <div aria-hidden="true">
        <Stepper steps={["Salida", "Pasajeros", "Condiciones", "Pago"]} current={1} />
      </div>
      <p aria-hidden="true" className="text-lg font-semibold text-tinta">
        Elige tu salida
      </p>
      <div aria-hidden="true" className="flex items-center gap-3 rounded-tarjeta bg-marca-700 p-4 sm:p-5">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {["¿De dónde sales?", "¿A dónde vas?"].map((etiqueta) => (
            <div key={etiqueta} className="flex min-h-14 flex-col justify-center gap-1.5 rounded-control bg-superficie px-4 py-2">
              <p className="text-sm font-medium leading-5 text-tinta-suave">{etiqueta}</p>
              <Skeleton className="h-4 w-2/5 rounded-pastilla" />
            </div>
          ))}
        </div>
        <div className="h-14 w-16 shrink-0 rounded-control bg-white/10" />
      </div>
      <div aria-hidden="true" className="flex flex-col gap-2">
        <p className="font-semibold text-tinta">¿Qué día sales?</p>
        <div className="flex gap-2 overflow-hidden py-1.5 sm:flex-wrap">
          <Skeleton className="h-14 w-24 shrink-0 rounded-pastilla" />
          <Skeleton className="h-14 w-24 shrink-0 rounded-pastilla" />
          <Skeleton className="h-14 w-24 shrink-0 rounded-pastilla" />
          <Skeleton className="h-14 w-24 shrink-0 rounded-pastilla" />
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-6 w-56 rounded-pastilla" />
          <Skeleton className="h-4 w-3/5 rounded-pastilla" />
        </div>
        <div className="flex flex-col gap-3">
          <DepartureOptionSkeleton />
          <DepartureOptionSkeleton />
          <DepartureOptionSkeleton />
          <DepartureOptionSkeleton />
        </div>
      </div>
    </SkeletonScreen>
  );
}
