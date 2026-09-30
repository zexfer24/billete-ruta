import { Stepper } from "@/components/stepper";
import { Skeleton, SkeletonCircle, SkeletonScreen } from "@/components/skeleton";
import { COUNTER_STEP_HINTS, COUNTER_STEP_LABELS, COUNTER_STEP_TITLES, TAQUILLA_DESCRIPTION } from "./texts";

/**
 * Silueta de la taquilla mientras llegan las salidas (spec 6.5): el título,
 * los pasos y la pregunta del paso 1 son reales; las salidas son tarjetas de
 * carga con la hora, el destino y los puestos; abajo, la barra de botones.
 */
export default function TaquillaLoading() {
  return (
    <SkeletonScreen label="Cargando la taquilla…" className="flex flex-col gap-6">
      <div className="min-w-0 max-w-3xl">
        <h1 className="text-2xl font-bold tracking-tight text-tinta sm:text-3xl">Taquilla</h1>
        <p className="mt-1.5 text-base leading-relaxed text-tinta-suave">{TAQUILLA_DESCRIPTION}</p>
      </div>

      <div className="flex max-w-3xl flex-col gap-6">
        <div className="flex flex-col gap-5 rounded-tarjeta border border-borde bg-superficie p-5 shadow-1">
          <Stepper steps={COUNTER_STEP_LABELS} current={1} label="Pasos de la venta" />
          <div>
            <p className="text-xl font-bold tracking-tight text-tinta">{COUNTER_STEP_TITLES[1]}</p>
            <p className="mt-1 text-[15px] text-tinta-suave">{COUNTER_STEP_HINTS[1]}</p>
          </div>
        </div>

        <div aria-hidden="true" className="flex flex-col gap-3">
          <Skeleton className="h-4 w-52 rounded-pastilla" />
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-tarjeta border-2 border-borde bg-superficie px-4 py-4 sm:gap-4"
            >
              <SkeletonCircle className="size-5" />
              <Skeleton className="h-7 w-14 sm:w-16" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-5 w-1/2 rounded-pastilla" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-28 rounded-pastilla" />
                  <Skeleton className="h-5 w-40 rounded-pastilla" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div
          aria-hidden="true"
          className="-mx-4 flex gap-3 border-t border-borde bg-superficie px-4 py-3 sm:mx-0 sm:rounded-tarjeta sm:border"
        >
          <Skeleton className="h-14 flex-[2] sm:ml-auto sm:w-44 sm:flex-none" />
        </div>
      </div>
    </SkeletonScreen>
  );
}
