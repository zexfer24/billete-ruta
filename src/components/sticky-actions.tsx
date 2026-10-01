import type { ReactNode } from "react";

interface StickyActionsProps {
  /** Botones de avance y retroceso del paso. */
  children: ReactNode;
  /** Línea opcional encima de los botones, por ejemplo el total a pagar. */
  summary?: ReactNode;
}

/**
 * Barra fija con los botones de un paso del asistente de reserva, pegada al
 * borde inferior de la pantalla.
 *
 * Mientras está montada (pasos 2 a 4), `globals.css` oculta la barra inferior
 * de navegación (`BottomNav`) con `html:has([data-acciones-fijas])`: en el
 * asistente queda una sola barra fija y un solo camino, el botón de avance y
 * "Atrás". Lo elegido se guarda en el borrador (`draft.ts`), así que salir por
 * la cabecera no pierde nada. Como la navegación no está, esta barra suma el
 * área segura del teléfono (`env(safe-area-inset-bottom)`).
 *
 * Desde `md` tiene el mismo ancho máximo y los mismos bordes laterales que la
 * columna de contenido, con las esquinas de arriba redondeadas.
 *
 * `data-acciones-fijas` también activa en `globals.css` el relleno de
 * desplazamiento que reserva su alto, para que el foco nunca quede tapado
 * (WCAG 2.2, 2.4.11) y `scrollIntoView` centre en la zona visible.
 */
export function StickyActions({ children, summary }: StickyActionsProps) {
  return (
    <div
      data-acciones-fijas=""
      className="fixed inset-x-0 bottom-0 z-30 border-t border-borde bg-superficie px-4 pb-[calc(0.625rem+env(safe-area-inset-bottom))] pt-2.5 shadow-2 md:mx-auto md:w-full md:max-w-2xl md:rounded-t-tarjeta md:border-x"
    >
      <div className="mx-auto flex w-full max-w-md flex-col gap-2 md:max-w-none">
        {summary ? <div className="text-sm text-tinta-suave">{summary}</div> : null}
        <div className="flex items-stretch gap-3">{children}</div>
      </div>
    </div>
  );
}
