/**
 * Clases de piezas de la taquilla que comparten la página y su silueta de
 * carga (`loading.tsx`), para que no se separen. Módulo puro: un archivo
 * `"use client"` no puede exportar constantes a un componente de servidor.
 */

/** Ficha de día del paso 1, común a la elegida y a las demás. */
export const DAY_CHIP_BASE_CLASS =
  "relative inline-flex min-h-11 shrink-0 items-center gap-2 rounded-pastilla border px-4 text-[15px] font-semibold";

/** Ficha de día sin elegir. */
export const DAY_CHIP_IDLE_CLASS = "border-borde-control bg-superficie text-tinta";

/** Ancho del buscador de salidas del paso 1. */
export const DEPARTURE_SEARCH_INPUT_CLASS = "max-w-md";
