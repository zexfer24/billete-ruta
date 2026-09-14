/** Par de colores de un bloque de agencia: fondo y texto, siempre con contraste 4.5:1 o más. */
export interface AgencyColor {
  bg: string;
  fg: string;
}

/** Paleta de bloques de agencia, estilo "línea 25 / 38 / B" de Transit. */
export const AGENCY_COLORS: readonly AgencyColor[] = [
  { bg: "#d41f1f", fg: "#ffffff" },
  { bg: "#0b62b5", fg: "#ffffff" },
  { bg: "#2e8b3a", fg: "#ffffff" },
  { bg: "#d9581d", fg: "#ffffff" },
  { bg: "#6b3fa0", fg: "#ffffff" },
  { bg: "#0e8a8a", fg: "#ffffff" },
];

/**
 * Índice estable de color para una agencia, derivado de la suma de códigos de
 * carácter de su id módulo el tamaño de la paleta. No depende de la base de
 * datos: la misma agencia siempre cae en el mismo color.
 */
export function agencyColorIndex(agencyId: string): number {
  let suma = 0;
  for (let i = 0; i < agencyId.length; i++) {
    suma += agencyId.charCodeAt(i);
  }
  return suma % AGENCY_COLORS.length;
}

/** Color de bloque asignado a una agencia. */
export function agencyColor(agencyId: string): AgencyColor {
  return AGENCY_COLORS[agencyColorIndex(agencyId)]!;
}

/**
 * Iniciales para el rótulo del bloque de agencia: la primera letra de hasta
 * tres palabras ("Expresos Los Andes" → "ELA"). Con una sola palabra, sus
 * primeras tres letras ("Andina" → "AND"). Cadena vacía si no hay palabras.
 */
export function agencyInitials(name: string): string {
  const palabras = name.trim().split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return "";
  if (palabras.length === 1) return palabras[0]!.slice(0, 3).toUpperCase();
  return palabras
    .slice(0, 3)
    .map((palabra) => palabra[0]!.toUpperCase())
    .join("");
}
