/**
 * Textos fijos de las secciones del tablero. Los usan el bloque real y su
 * silueta de carga, para que el título, la descripción y el botón se pinten
 * reales desde el primer instante (spec 6.5) y no cambien al llegar los datos.
 */
export interface SectionTexts {
  title: string;
  description: string;
  actionLabel: string;
}

export const TRIPS_TODAY_SECTION: SectionTexts = {
  title: "Salidas de hoy",
  description: "Cuándo embarcó, partió y llegó cada bus. Toca una salida para abrirla.",
  actionLabel: "Ver todas las salidas",
};

export const FLEET_SECTION: SectionTexts = {
  title: "Choferes y buses",
  description: "Quién está en ruta o embarcando, y quién no tiene viaje hoy.",
  actionLabel: "Ver la flota",
};

/** Ancla de "Tickets nuevos": la cifra "Tickets" del resumen enlaza a esa sección. */
export const TICKETS_SECTION_ID = "tickets-nuevos";

/** "Tickets nuevos" depende del periodo: "Los últimos tickets emitidos hoy". */
export function ticketsSection(periodPhrase: string): SectionTexts {
  return {
    title: "Tickets nuevos",
    description: `Los últimos tickets emitidos ${periodPhrase}.`,
    actionLabel: "Ver todos",
  };
}

/**
 * Etiquetas de las tres cifras del periodo, en el orden del tablero. No
 * cambian con el periodo: la silueta las pinta reales.
 */
export const FIGURE_LABELS = {
  recaudado: "Recaudado",
  salidas: "Salidas",
  tickets: "Tickets",
} as const;

export const ACTIVITY_TITLE = "Actividad reciente";

export function activityDescription(periodPhrase: string): string {
  return `Ventas, cobros y embarques de tu agencia de ${periodPhrase}.`;
}

export const QUICK_REGISTER_SECTION = {
  title: "Registro rápido",
  description: "Crea una salida o registra un vehículo o un chofer sin salir del tablero.",
} as const;
