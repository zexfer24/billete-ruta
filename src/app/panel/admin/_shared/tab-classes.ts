/**
 * Clases de las pestañas del administrador, compartidas por `AdminTabs`
 * (cliente) y su silueta de carga (servidor), para que las dos repartan las
 * pestañas en las mismas filas a cualquier ancho. Vive aparte porque un valor
 * importado de un archivo `"use client"` no llega como texto a un componente
 * de servidor.
 */

/** Contenedor: una tarjeta que envuelve las pestañas en varias filas si no caben. */
export const ADMIN_TABS_ROW_CLASS =
  "flex w-full flex-wrap gap-1 rounded-tarjeta border border-borde bg-superficie p-1 shadow-1";

/**
 * Contenedor de las pestañas de periodo: en el teléfono, rejilla de dos
 * columnas (2 × 2), en vez de 3 + 1 con "Otras fechas" sola en su fila; desde
 * `sm`, en una sola fila como las demás.
 */
export const ADMIN_TABS_GRID_CLASS =
  "grid w-full grid-cols-2 gap-1 rounded-tarjeta border border-borde bg-superficie p-1 shadow-1 sm:flex sm:flex-wrap";

/** Cada pestaña: 44 px de alto; en el teléfono crece para llenar su fila. */
export const ADMIN_TAB_CLASS =
  "inline-flex min-h-11 grow items-center justify-center gap-2 rounded-control px-4 text-[15px] font-semibold sm:grow-0 sm:justify-start";

/** Pestaña elegida. */
export const ADMIN_TAB_ACTIVE_CLASS = "bg-marca-50 text-marca-800 ring-1 ring-inset ring-marca-200";
