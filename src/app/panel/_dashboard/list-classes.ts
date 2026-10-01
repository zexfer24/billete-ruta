/**
 * Clases de las listas de "Tickets nuevos" y "Choferes y buses", compartidas
 * por los bloques reales y sus siluetas (`TicketsSkeleton`, `FleetSkeleton`)
 * para que la geometría de cada fila no se separe.
 */
export const TICKETS_LIST_CLASS = "flex flex-col divide-y divide-borde";
export const TICKET_ROW_CLASS = "flex flex-col gap-0.5 py-2 first:pt-0 last:pb-0";
export const FLEET_LIST_CLASS = "flex flex-col divide-y divide-borde";
export const FLEET_DRIVER_ROW_CLASS = "flex flex-col gap-1 py-3 first:pt-0 last:pb-0";

/**
 * Por debajo de `md`, "Choferes y buses" y "Tickets nuevos" muestran solo las
 * primeras `MAX_FILAS_MOVIL` filas (la sección ya tiene "Ver la flota" y "Ver
 * todos"): con cinco y cinco, en el teléfono lo secundario ocupaba casi una
 * pantalla entera y empujaba "Actividad reciente" y "Registro rápido" al
 * fondo (spec 7.2: lo secundario va debajo y sin pesar más que lo urgente).
 */
export const MAX_FILAS_MOVIL = 3;

/** Clases extra de la fila `index` de esas listas: se oculta en el teléfono desde la cuarta. */
export function mobileRowClass(index: number): string {
  if (index >= MAX_FILAS_MOVIL) return "max-md:hidden";
  // La última visible en el teléfono no es `:last-child`: se le quita a mano el aire de abajo.
  return index === MAX_FILAS_MOVIL - 1 ? "max-md:pb-0" : "";
}

/** Máximo de choferes que lista "Choferes y buses" antes de remitir a la flota completa. */
export const FLEET_MAX_FILAS = 5;

/** Línea de los choferes que ya salen en "Salidas de hoy" y por eso no se listan. */
export const FLEET_NOTE_CLASS = "text-sm leading-snug text-tinta-suave";

/** Enlace "Ver los N choferes" al pie de "Choferes y buses" (y su silueta). */
export const FLEET_MORE_LINK_CLASS =
  "foco inline-flex min-h-11 w-fit items-center gap-1 rounded-control px-2 text-[15px] font-semibold text-marca-700 hover:bg-marca-50";
