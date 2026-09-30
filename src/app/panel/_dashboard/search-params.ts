/**
 * Lectura defensiva de `searchParams` en las páginas del panel de agencia
 * (spec 1.9: ninguna URL manipulada tumba una pantalla). Módulo puro,
 * compartido por el tablero y "Pasajeros y pagos".
 */

/** Valor crudo de un parámetro tal como lo entrega Next: texto, lista (`?a=1&a=2`) o nada. */
export type RawSearchParam = string | string[] | undefined;

/**
 * El valor de un parámetro solo si llegó una vez y como texto; una lista
 * repetida o un valor ausente cuentan como no enviado.
 */
export function firstParam(value: RawSearchParam): string | undefined {
  return typeof value === "string" ? value : undefined;
}

/**
 * Traduce el código corto de `?ok=` a su texto. Un código desconocido, o una
 * clave heredada de `Object.prototype` como `constructor`, no muestra nada.
 */
export function okMessage(labels: Readonly<Record<string, string>>, code: RawSearchParam): string | undefined {
  const valor = firstParam(code);
  if (!valor || !Object.hasOwn(labels, valor)) return undefined;
  return labels[valor];
}

/**
 * Texto de `?error=` recortado a una longitud razonable, para que un enlace
 * manipulado no llene la pantalla. Vacío o repetido cuenta como ausente.
 */
export function errorMessage(value: RawSearchParam, maxLength = 300): string | undefined {
  const valor = firstParam(value)?.trim();
  if (!valor) return undefined;
  return valor.length > maxLength ? `${valor.slice(0, maxLength)}…` : valor;
}
