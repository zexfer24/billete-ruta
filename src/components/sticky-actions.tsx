import type { ReactNode } from "react";

interface StickyActionsProps {
  /** Botones de avance y retroceso del paso. */
  children: ReactNode;
  /** Línea opcional encima de los botones, por ejemplo el total a pagar. */
  summary?: ReactNode;
}

/**
 * Barra fija con los botones de un paso del asistente de reserva, pegada
 * encima de la barra inferior de navegación (`BottomNav`).
 *
 * La barra inferior mide unos 70 px más el área segura del teléfono y es la
 * única que suma `env(safe-area-inset-bottom)`; esta barra se apoya 2 px por
 * debajo de su borde superior (68 px más el área segura), así nunca queda
 * una rendija entre las dos ni se tapan: la navegación va encima (z-30) y
 * esta debajo (z-20). Tiene el mismo ancho máximo que el contenido.
 */
export function StickyActions({ children, summary }: StickyActionsProps) {
  return (
    <div className="fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-20 border-t border-borde bg-superficie px-4 pb-3 pt-3 shadow-2">
      <div className="mx-auto flex w-full max-w-md flex-col gap-2 md:max-w-2xl">
        {summary ? <div className="text-sm text-tinta-suave">{summary}</div> : null}
        <div className="flex items-stretch gap-3">{children}</div>
      </div>
    </div>
  );
}
