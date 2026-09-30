import { IconClock } from "./icons";
import { Isotipo } from "./logo";

/**
 * Pie del panel de agencia y del terminal. Lleva la única mención de la nota
 * de horas (spec 6.4): ninguna página la repite.
 */
export function PanelFooter() {
  return (
    <footer className="border-t border-borde px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 text-sm text-tinta-suave sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2">
          <IconClock width={18} height={18} aria-hidden="true" className="shrink-0" />
          Horas en formato de 24 horas, hora de Caracas.
        </p>
        <p className="flex items-center gap-2 font-semibold text-marca-700">
          <Isotipo decorative className="h-6 w-auto" />
          TicketRuta
        </p>
      </div>
    </footer>
  );
}
