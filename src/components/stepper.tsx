import { IconCheck } from "./icons";
import { cx, stepDescription, stepState, type StepState } from "./ui-classes";

const CIRCLE_CLASSES: Record<StepState, string> = {
  hecho: "bg-marca-600 text-white",
  actual: "bg-marca-600 text-white ring-4 ring-marca-100",
  pendiente: "border-2 border-borde-control bg-superficie text-tinta-suave",
};

const LABEL_CLASSES: Record<StepState, string> = {
  hecho: "font-medium text-tinta",
  actual: "font-bold text-marca-700",
  pendiente: "font-medium text-tinta-suave",
};

/**
 * Indicador de pasos numerados de un flujo guiado (spec 6.4), como el
 * asistente de reserva del pasajero o la venta en taquilla. Cada paso tiene
 * su número y etiqueta visibles; los hechos muestran una marca de
 * verificación y el actual lleva `aria-current="step"`. `current` empieza
 * en 1. No navega: solo orienta. Sin estado, sirve en servidor y en cliente.
 */
export function Stepper({
  steps,
  current,
  label = "Pasos",
  className,
}: {
  steps: readonly string[];
  current: number;
  /** Nombre de la lista para lectores de pantalla. */
  label?: string;
  className?: string;
}) {
  const total = steps.length;

  return (
    <ol aria-label={label} className={cx("flex w-full items-start", className)}>
      {steps.map((stepLabel, index) => {
        const step = index + 1;
        const state = stepState(step, current);
        const reached = state !== "pendiente";

        return (
          <li
            key={`${step}-${stepLabel}`}
            aria-current={state === "actual" ? "step" : undefined}
            className="relative flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center"
          >
            {index > 0 ? (
              <span
                aria-hidden="true"
                className={cx(
                  "absolute top-[17px] right-[calc(50%+24px)] left-[calc(-50%+24px)] h-0.5 rounded-pastilla",
                  reached ? "bg-marca-600" : "bg-borde",
                )}
              />
            ) : null}
            <span
              aria-hidden="true"
              className={cx(
                "tabular relative grid size-9 shrink-0 place-items-center rounded-full text-base font-bold",
                CIRCLE_CLASSES[state],
              )}
            >
              {state === "hecho" ? <IconCheck className="size-5" /> : step}
            </span>
            <span aria-hidden="true" className={cx("px-1 text-sm leading-tight", LABEL_CLASSES[state])}>
              {stepLabel}
            </span>
            <span className="sr-only">{stepDescription(step, total, stepLabel, current)}</span>
          </li>
        );
      })}
    </ol>
  );
}
