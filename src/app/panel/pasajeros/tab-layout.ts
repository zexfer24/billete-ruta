/**
 * Reparto de las pestañas de "Pasajeros y pagos" en el teléfono, compartido
 * por `ViewTabs` y su silueta (`TabsSkeleton`). Módulo puro, sin React.
 *
 * Desde `sm` las pestañas van en una fila que baja de línea si no cabe. Por
 * debajo, van en una rejilla de dos columnas parejas, sin desplazarse de
 * lado y con un solo diseño para las cinco: el contador al lado de la
 * etiqueta y 44 px de alto. Con un número impar de pestañas, la última
 * ("Todas") ocupa el ancho completo de su fila, a propósito, para que no
 * quede media fila vacía como un error de maquetación.
 */

/** Contenedor: rejilla de 2 columnas en el teléfono, fila flexible desde `sm`. */
export const TABS_CONTAINER_CLASS =
  "grid w-full grid-cols-2 gap-1 rounded-tarjeta border border-borde bg-superficie p-1 shadow-1 sm:flex sm:flex-wrap";

/** Clases de la pestaña `index` de `total` en el teléfono (se ignoran desde `sm`). */
export function tabItemLayoutClass(index: number, total: number): string {
  return total % 2 === 1 && index === total - 1 ? "col-span-2" : "col-span-1";
}
