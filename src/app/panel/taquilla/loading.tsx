import { Stepper } from "@/components/stepper";
import { Skeleton, SkeletonCircle, SkeletonScreen } from "@/components/skeleton";
import { panelInputClass } from "@/components/panel-ui";
import { cx } from "@/components/ui-classes";
import { COUNTER_STEP_HINTS, COUNTER_STEP_LABELS, COUNTER_STEP_TITLES, TAQUILLA_DESCRIPTION } from "./texts";
import { DAY_CHIP_BASE_CLASS, DAY_CHIP_IDLE_CLASS, DEPARTURE_SEARCH_INPUT_CLASS } from "./classes";

/** Anchos de las fichas de día de la silueta ("Hoy", "Mañana", "Vie 2 oct"…). */
const CHIP_WIDTHS = ["w-8", "w-14", "w-16", "w-16", "w-16"] as const;

/**
 * Silueta de la taquilla mientras llegan las salidas (spec 6.5). El título,
 * los pasos y la pregunta del paso 1 se pintan con su texto real, pero como
 * decoración (`aria-hidden`, el título en un `p` y no en un `h1`): el lector
 * de pantalla solo oye «Cargando la taquilla…» y la página no tiene dos `h1`
 * al llegar. Debajo, el buscador por origen o destino con su ayuda y las
 * fichas de día (el caso habitual, con más de seis salidas en la semana), la
 * etiqueta del día, las tarjetas de salida y la barra de botones. En el
 * teléfono, la frase de la cabecera y la pista del paso se ocultan igual que
 * en la página.
 */
export default function TaquillaLoading() {
  return (
    <SkeletonScreen label="Cargando la taquilla…" className="flex flex-col gap-6">
      <div aria-hidden="true" className="min-w-0 max-w-3xl">
        <p className="text-2xl font-bold tracking-tight text-tinta sm:text-3xl">Taquilla</p>
        <p className="mt-1.5 text-base leading-relaxed text-tinta-suave">
          <span className="hidden sm:inline">{TAQUILLA_DESCRIPTION}</span>
        </p>
      </div>

      <div className="flex max-w-3xl flex-col gap-6">
        <div
          aria-hidden="true"
          className="flex flex-col gap-5 rounded-tarjeta border border-borde bg-superficie p-5 shadow-1"
        >
          <Stepper steps={COUNTER_STEP_LABELS} current={1} label="Pasos de la venta" />
          <div>
            <p className="text-xl font-bold tracking-tight text-tinta">{COUNTER_STEP_TITLES[1]}</p>
            <p className="mt-1 hidden text-[15px] text-tinta-suave sm:block">{COUNTER_STEP_HINTS[1]}</p>
          </div>
        </div>

        <div aria-hidden="true" className="flex flex-col gap-5">
          {/* Buscador: la etiqueta es texto fijo; la ayuda lleva el número de
              salidas, así que va en barra. */}
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-semibold text-tinta">Buscar por origen o destino</p>
            <div className={panelInputClass(cx("min-h-12", DEPARTURE_SEARCH_INPUT_CLASS))} />
            <span className="flex h-5 items-center">
              <Skeleton className="h-4 w-72 max-w-full rounded-pastilla" />
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {CHIP_WIDTHS.map((width, i) => (
              <span key={i} className={cx(DAY_CHIP_BASE_CLASS, DAY_CHIP_IDLE_CLASS)}>
                <Skeleton className={cx("h-4 rounded-pastilla", width)} />
              </span>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            <Skeleton className="h-4 w-52 rounded-pastilla" />
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-tarjeta border-2 border-borde bg-superficie px-4 py-4 sm:gap-4"
              >
                <SkeletonCircle className="size-5" />
                {/* `shrink-0` y `min-w-0`: en el teléfono la hora conserva su ancho y
                    las barras se ajustan a la columna en vez de salirse de la tarjeta. */}
                <Skeleton className="h-7 w-14 shrink-0 sm:w-16" />
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <Skeleton className="h-5 w-1/2 rounded-pastilla" />
                  <div className="flex min-w-0 gap-2">
                    <Skeleton className="h-6 w-2/5 max-w-28 rounded-pastilla" />
                    <Skeleton className="h-5 w-1/2 max-w-40 rounded-pastilla" />
                  </div>
                  <Skeleton className="h-4 w-3/5 max-w-56 rounded-pastilla" />
                </div>
              </div>
            ))}
          </div>
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
