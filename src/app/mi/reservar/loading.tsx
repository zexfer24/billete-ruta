import { Skeleton, SkeletonScreen } from "@/components/skeleton";
import { Stepper } from "@/components/stepper";
import { SkeletonPageTitle } from "../_components/skeletons";

/** Fila de salida: raíl con el bloque de la agencia, cuándo sale, precio, ruta y botón. */
function DepartureRowSkeleton() {
  return (
    <div aria-hidden="true" className="rounded-tarjeta border border-borde bg-superficie p-4 shadow-1">
      <div className="flex items-center gap-3">
        <span className="size-2 shrink-0 rounded-full bg-borde-control" />
        <span className="h-px flex-1 bg-borde" />
        <Skeleton className="h-11 w-16" />
        <span className="h-px flex-1 bg-borde" />
        <span className="size-2 shrink-0 rounded-full bg-borde-control" />
        <Skeleton className="h-4 w-14 rounded-pastilla" />
      </div>
      <div className="mt-3 flex items-start justify-between gap-3">
        <Skeleton className="h-5 w-32 rounded-pastilla" />
        <div className="flex flex-col items-end gap-1.5">
          <Skeleton className="h-6 w-20 rounded-pastilla" />
          <Skeleton className="h-4 w-16 rounded-pastilla" />
        </div>
      </div>
      <Skeleton className="mt-2 h-4 w-3/5 rounded-pastilla" />
      <div className="mt-3 flex justify-end">
        <Skeleton className="h-11 w-24 rounded-pastilla" />
      </div>
    </div>
  );
}

/**
 * Silueta del asistente de reserva en su primer paso: título, pasos reales,
 * buscador morado, filtros de cuándo salir y cuatro salidas.
 */
export default function ReservarLoading() {
  return (
    <SkeletonScreen label="Cargando las salidas…" className="flex flex-col gap-6">
      <SkeletonPageTitle subtitle="Cuatro pasos: eliges la salida, dices quiénes viajan, aceptas las condiciones y eliges cómo pagar.">
        Reservar un viaje
      </SkeletonPageTitle>
      <div aria-hidden="true">
        <Stepper steps={["Salida", "Pasajeros", "Condiciones", "Pago"]} current={1} />
      </div>
      <p aria-hidden="true" className="text-xl font-bold tracking-tight text-tinta">
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
      <div aria-hidden="true" className="flex flex-wrap gap-2">
        <Skeleton className="h-11 w-20 rounded-pastilla" />
        <Skeleton className="h-11 w-16 rounded-pastilla" />
        <Skeleton className="h-11 w-40 rounded-pastilla" />
      </div>
      <Skeleton className="h-4 w-4/5 rounded-pastilla" />
      <div className="flex flex-col gap-3">
        <Skeleton className="h-6 w-32 rounded-pastilla" />
        <DepartureRowSkeleton />
        <DepartureRowSkeleton />
        <DepartureRowSkeleton />
        <DepartureRowSkeleton />
      </div>
    </SkeletonScreen>
  );
}
