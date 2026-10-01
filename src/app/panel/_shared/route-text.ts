/**
 * Textos de ruta para las tablas del panel. Módulo puro.
 */

/** Texto comparable: sin acentos, en minúsculas, sin guiones ni flechas y con un solo espacio. */
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[-‐‑‒–—―→>/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Subtítulo "Origen → Destino" de una ruta, solo si dice algo que el nombre no
 * dice ya. Si el nombre es "Caracas – San Cristóbal" (con guion, raya o
 * flecha) y la ruta va de Caracas a San Cristóbal, devuelve `null` para no
 * repetir la misma línea dos veces.
 */
export function routeSubtitle(name: string, origin: string, destination: string): string | null {
  if (normalizar(name) === normalizar(`${origin} ${destination}`)) return null;
  return `${origin} → ${destination}`;
}

/**
 * Nombre de la ruta con flecha, como en el resto del panel ("Caracas → San
 * Cristóbal"), a partir del nombre libre de la ruta ("Caracas – San
 * Cristóbal"): se cambia el primer guion o raya rodeado de espacios por la
 * flecha y el resto del nombre queda igual. Un nombre sin ese separador
 * ("Expreso Los Llanos") no cambia. Es la misma regla que `arrowRouteName`
 * de Pasajeros, para que salidas, flota, abordaje y reportes escriban la ruta
 * igual que el tablero. El CSV conserva el nombre original.
 */
export function arrowRouteName(name: string): string {
  return name.replace(/\s+[-‐‑‒–—―]\s+/, " → ");
}
