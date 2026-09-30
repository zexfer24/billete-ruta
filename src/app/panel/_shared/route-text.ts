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
