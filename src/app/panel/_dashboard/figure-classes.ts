/**
 * Clases de la rejilla de cifras del tablero y de cada celda, compartidas por
 * `FiguresBlock` y su silueta (`FiguresSkeleton`) para que no se separen. En
 * el teléfono, "Recaudado" ocupa la fila entera (el monto necesita el ancho) y
 * las otras dos comparten fila; desde `md`, las tres en una fila. La celda es
 * `grid` para que la tarjeta estire su alto al de sus vecinas.
 */
export const FIGURES_GRID_CLASS = "grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3";
export const FIGURE_WIDE_CELL_CLASS = "col-span-2 grid md:col-span-1";
export const FIGURE_CELL_CLASS = "grid";
