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

/**
 * Teléfono en grupos para leerlo y dictarlo: "+58 414 348 8126". Solo cambia
 * cómo se muestra; lo guardado y lo que acepta la búsqueda siguen en E.164.
 * Venezuela (+58) y Colombia (+57) usan 10 dígitos en grupos de 3, 3 y 4; un
 * número con otra forma se muestra tal cual.
 */
export function formatPhone(phone: string): string {
  const match = /^\+(58|57)(\d{3})(\d{3})(\d{4})$/.exec(phone.trim());
  if (!match) return phone;
  const [, country, a, b, c] = match;
  return `+${country} ${a} ${b} ${c}`;
}

/**
 * Término que se busca en la base de datos a partir de lo escrito. Si parece
 * un teléfono (solo dígitos, espacios, guiones, puntos, paréntesis o "+"),
 * se le quitan los separadores y el 0 inicial, para que pegar el número tal
 * como se muestra ("+58 414 348 8126") o escribirlo "0414-348-8126" lo
 * encuentre. Cualquier otra búsqueda pasa tal cual.
 */
export function accountSearchTerm(query: string | undefined): string | undefined {
  if (!query) return query;
  if (!/^[+\d\s().-]+$/.test(query) || query.replace(/\D/g, "").length < 7) return query;
  return query.replace(/[\s().-]/g, "").replace(/^0+/, "");
}
