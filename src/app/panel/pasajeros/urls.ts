import { panelFeedbackUrl } from "@/app/panel/feedback";
import { reservationViewFromSlug } from "@/modules/reports";
import type { ReservationView } from "@/modules/reports";

/**
 * Parámetros de la URL de "Pasajeros y pagos". Módulo puro (sin React ni
 * Next): arma siempre la misma cadena de consulta, en el mismo orden, para
 * que enlaces y redirecciones sean predecibles y fáciles de probar.
 */
export interface PasajerosUrlParams {
  vista?: ReservationView;
  salida?: string;
  buscar?: string;
  pagina?: number;
  reserva?: string;
  comprobante?: string;
  registrar?: "cobro";
  ok?: string;
  error?: string;
}

/**
 * Arma la URL de `/panel/pasajeros`, omitiendo los parámetros vacíos y la
 * página 1 (es el valor por defecto, no hace falta escribirla). El orden de
 * los parámetros es siempre el mismo, sin importar el orden en que llegan.
 */
export function pasajerosUrl(params: PasajerosUrlParams): string {
  return panelFeedbackUrl("/panel/pasajeros", {
    vista: params.vista,
    salida: params.salida,
    buscar: params.buscar,
    pagina: params.pagina && params.pagina > 1 ? params.pagina : undefined,
    reserva: params.reserva,
    comprobante: params.comprobante,
    registrar: params.registrar,
    ok: params.ok,
    error: params.error,
  });
}

/**
 * Última página válida para un total y un tamaño de página dados. Con
 * `total` en cero la única página válida es la 1 (no hay de dónde elegir);
 * si `pagina` ya cae dentro del rango, se devuelve tal cual. Función pura,
 * usada por la página para no quedarse en una página vacía tras aprobar o
 * rechazar el último elemento de la página en la que estaba.
 */
export function lastValidPage(total: number, pageSize: number, pagina: number): number {
  if (total <= 0) return 1;
  const totalPaginas = Math.max(1, Math.ceil(total / pageSize));
  return Math.min(Math.max(1, pagina), totalPaginas);
}

/**
 * Reconstruye los parámetros de contexto (vista, salida, buscar, página) a
 * partir de los campos ocultos de un formulario, para armar enlaces como "Ver
 * reserva completa" desde un panel que solo recibió esos campos como texto.
 */
export function pasajerosUrlFromHidden(
  hidden: Record<string, string>,
  extra: PasajerosUrlParams = {},
): string {
  const pagina = hidden.pagina ? Number.parseInt(hidden.pagina, 10) : undefined;
  return pasajerosUrl({
    vista: reservationViewFromSlug(hidden.vista),
    salida: hidden.salida,
    buscar: hidden.buscar,
    pagina: pagina && Number.isFinite(pagina) ? pagina : undefined,
    ...extra,
  });
}
