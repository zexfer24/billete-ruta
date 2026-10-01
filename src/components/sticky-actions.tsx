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
 * esta debajo (z-20).
 *
 * Desde `md` tiene el mismo ancho máximo y los mismos bordes laterales que la
 * tarjeta de navegación, con las esquinas de arriba redondeadas, y baja 1 rem
 * más por detrás de ella para rellenar sus esquinas redondeadas: las dos
 * barras se leen como un solo bloque.
 *
 * `data-acciones-fijas` activa en `globals.css` el relleno de desplazamiento
 * que reserva el alto de las dos barras, para que el foco nunca quede tapado
 * (WCAG 2.2, 2.4.11) y `scrollIntoView` centre en la zona visible.
 */
export function StickyActions({ children, summary }: StickyActionsProps) {
  return (
    <div
      data-acciones-fijas=""
      className="fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-20 border-t border-borde bg-superficie px-4 pb-2.5 pt-2.5 shadow-2 md:bottom-[calc(3.25rem+env(safe-area-inset-bottom))] md:mx-auto md:w-full md:max-w-2xl md:rounded-t-tarjeta md:border-x md:pb-[1.625rem]"
    >
      <div className="mx-auto flex w-full max-w-md flex-col gap-2 md:max-w-none">
        {summary ? <div className="text-sm text-tinta-suave">{summary}</div> : null}
        <div className="flex items-stretch gap-3">{children}</div>
      </div>
    </div>
  );
}
