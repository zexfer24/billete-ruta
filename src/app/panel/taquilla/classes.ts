/**
 * Clases de piezas de la taquilla que comparten la página y su silueta de
 * carga (`loading.tsx`), para que no se separen. Módulo puro: un archivo
 * `"use client"` no puede exportar constantes a un componente de servidor.
 */

/**
 * Rejilla de las fichas de día: cuatro columnas fijas en el teléfono (dos
 * filas para siete días, sin desplazarse de lado) y fila que baja de línea
 * desde `sm`.
 */
export const DAY_CHIPS_CONTAINER_CLASS = "grid grid-cols-4 gap-2 sm:flex sm:flex-wrap";

/** Ficha de día del paso 1, común a la elegida y a las demás. */
export const DAY_CHIP_BASE_CLASS =
  "relative inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-pastilla border px-2 text-[15px] font-semibold sm:px-4";

/** Ficha de día sin elegir. */
export const DAY_CHIP_IDLE_CLASS = "border-borde-control bg-superficie text-tinta";

/**
 * Ficha de día elegida: como la tarjeta de salida elegida y el selector de
 * periodo del tablero (fondo lila y borde morado), no un relleno morado que
 * compita con «Continuar», la única acción principal (spec 1.1).
 */
export const DAY_CHIP_SELECTED_CLASS = "border-marca-600 bg-marca-50 text-marca-800 ring-1 ring-inset ring-marca-600";

/**
 * Margen de desplazamiento bajo cada tarjeta de salida, igual o mayor que el
 * alto de la barra fija de «Continuar» (unos 81 px): al enfocar o elegir una
 * tarjeta con el teclado, el navegador la deja por encima de la barra.
 */
export const DEPARTURE_CARD_SCROLL_CLASS = "scroll-mb-24";

/** Ancho del buscador de salidas del paso 1. */
export const DEPARTURE_SEARCH_INPUT_CLASS = "max-w-md";
