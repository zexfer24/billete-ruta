import { plural } from "../_shared/day-label";

/**
 * Título del aviso de salidas asignadas al editar una unidad. `count` es el
 * total real de salidas programadas en los próximos 7 días (`upcomingCount`
 * de la flota), no la lista recortada, así que la cifra es exacta.
 */
export function upcomingTitle(count: number): string {
  return `Tiene ${plural(count, "salida asignada", "salidas asignadas")} en los próximos 7 días`;
}
