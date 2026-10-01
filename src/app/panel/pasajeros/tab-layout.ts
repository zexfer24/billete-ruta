/**
 * Reparto de las pestañas de "Pasajeros y pagos" en el teléfono, compartido
 * por `ViewTabs` y su silueta (`TabsSkeleton`). Módulo puro, sin React.
 *
 * Desde `sm` las pestañas van en una fila que baja de línea si no cabe. Por
 * debajo, las cinco pestañas se repartían 2 + 2 + 1 y "Todas" quedaba sola en
 * una tercera fila, como un error de maquetación. Ahora van en dos filas
 * parejas, sin desplazarse de lado: arriba las dos de trabajo ("Por revisar"
 * y "Por cobrar"), cada una de medio ancho, y abajo las otras tres, de un
 * tercio cada una, con el contador debajo de la etiqueta para que quepan.
 */

/** Contenedor: rejilla de 6 columnas en el teléfono, fila flexible desde `sm`. */
export const TABS_CONTAINER_CLASS =
  "grid w-full grid-cols-6 gap-1 rounded-tarjeta border border-borde bg-superficie p-1 shadow-1 sm:flex sm:flex-wrap";

/** Clases de la pestaña `index` de `total` en el teléfono (se ignoran desde `sm`). */
export function tabItemLayoutClass(index: number, total: number): string {
  if (total === 5 && index >= 2) return "col-span-2 max-sm:flex-col max-sm:gap-0.5 max-sm:px-2 max-sm:py-1";
  return "col-span-3";
}
