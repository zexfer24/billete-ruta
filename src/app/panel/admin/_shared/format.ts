/**
 * Textos con número para las pantallas del administrador: siempre el singular
 * o el plural correcto, nunca "reserva(s)" (spec 2026-09-30, sección 1.2).
 * Funciones puras, probadas en tests/unit/panel/admin-format.test.ts.
 */

const NUMBER_FORMAT = new Intl.NumberFormat("es-VE", { maximumFractionDigits: 0 });

/** Un entero con punto de miles, como se escribe en Venezuela: 1.234. */
export function formatCount(value: number): string {
  return NUMBER_FORMAT.format(value);
}

/** "1 reserva pagada", "3 reservas pagadas", "0 reservas pagadas". */
export function countLabel(value: number, singular: string, plural: string): string {
  return `${formatCount(value)} ${value === 1 ? singular : plural}`;
}

/** Máximo de caracteres que se aceptan en una búsqueda por URL. */
export const MAX_SEARCH_LENGTH = 80;

/** Deja una búsqueda de la URL lista para usar: sin espacios sobrantes, con largo acotado, o `undefined` si queda vacía. */
export function cleanSearch(value: string | undefined): string | undefined {
  const trimmed = value?.trim().slice(0, MAX_SEARCH_LENGTH).trim();
  return trimmed ? trimmed : undefined;
}

/** Número de página de la URL: entero desde 1; cualquier otro valor da 1. */
export function pageFromParam(value: string | undefined): number {
  if (!value || !/^\d{1,6}$/.test(value)) return 1;
  return Math.max(1, Number.parseInt(value, 10));
}
