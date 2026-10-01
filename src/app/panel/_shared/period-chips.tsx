import Link from "next/link";
import { IconCheck } from "@/components/icons";
import { cx } from "@/components/ui-classes";

/**
 * Pastilla de periodo: 44 px de alto. La elegida va en morado suave, no
 * rellena (el morado relleno queda solo para la acción principal, spec 1.1),
 * y se distingue de las demás por algo más que el color: un borde más grueso
 * (anillo interior, que no cambia el tamaño de la caja ni mueve la fila) y la
 * marca de verificación delante del texto.
 */
export const PERIOD_CHIP_CLASS =
  "foco inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-pastilla border px-3 text-[15px] font-semibold transition-colors duration-150 ease-out motion-reduce:transition-none sm:px-4";

/** Pastilla elegida y pastilla sin elegir. */
export const PERIOD_CHIP_ACTIVE_CLASS = "border-marca-600 bg-marca-50 text-marca-800 ring-1 ring-inset ring-marca-600";
export const PERIOD_CHIP_IDLE_CLASS = "border-borde-control bg-superficie text-tinta hover:bg-marca-50";

/**
 * Rejilla de las pastillas: en el teléfono, una fila de tres del mismo ancho;
 * desde `sm`, en fila con su ancho natural.
 */
export const PERIOD_CHIP_LIST_CLASS = "grid grid-cols-3 gap-2 sm:flex sm:flex-wrap";

/** Marca de la pastilla elegida (decorativa: `aria-current` ya lo dice). */
export function PeriodChipCheck() {
  return <IconCheck className="size-5 shrink-0" />;
}

export interface PeriodChipOption {
  href: string;
  label: string;
  active: boolean;
}

/**
 * Elección de periodo como filtro (no como navegación): pastillas compactas,
 * la elegida con `aria-current="page"`. Es la pieza común del panel de agencia
 * para elegir "Hoy / 7 días / 30 días", para que el mismo filtro se vea igual
 * en todas las pantallas del operador; las pestañas (`PanelTabs`) quedan para
 * cambiar de vista.
 */
export function PeriodChips({ options, labelledBy }: { options: readonly PeriodChipOption[]; labelledBy: string }) {
  return (
    <nav aria-labelledby={labelledBy} className="w-full sm:w-auto">
      <ul className={PERIOD_CHIP_LIST_CLASS}>
        {options.map((opcion) => (
          <li key={opcion.href}>
            <Link
              href={opcion.href}
              aria-current={opcion.active ? "page" : undefined}
              className={cx(
                PERIOD_CHIP_CLASS,
                "w-full justify-center sm:w-auto sm:justify-start",
                opcion.active ? PERIOD_CHIP_ACTIVE_CLASS : PERIOD_CHIP_IDLE_CLASS,
              )}
            >
              {opcion.active ? <PeriodChipCheck /> : null}
              {opcion.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
