/**
 * Lectura y formato de los montos que escribe el administrador en la
 * pantalla de tasas. Puro y sin dependencias: lo usan la acción de servidor
 * (para validar) y el formulario de cliente (para avisar antes de enviar y
 * mostrar el valor en la confirmación), así ambos aceptan exactamente lo
 * mismo. Probado en tests/unit/panel/admin-format.test.ts.
 */

/** Mensaje cuando el monto no se puede leer. */
export const INVALID_AMOUNT_MESSAGE = "Escribe un monto mayor que cero, con coma para los decimales. Por ejemplo: 2,50.";

/**
 * Convierte lo escrito ("2,50", " 36.4 ") en un número con punto decimal
 * ("2.50", "36.4"). Acepta una coma o un punto como separador decimal, sin
 * separador de miles. Devuelve `null` si no es un número mayor que cero.
 */
export function parseAmount(raw: string): string | null {
  const normalized = raw.trim().replace(",", ".");
  if (!/^(\d+(\.\d*)?|\.\d+)$/.test(normalized)) return null;
  const value = Number(normalized);
  return Number.isFinite(value) && value > 0 ? normalized : null;
}

const AMOUNT_FORMAT = new Intl.NumberFormat("es-VE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 6,
});

/** Un monto ya leído con su prefijo de moneda y coma decimal: "$ 2,50", "Bs. 36,4567". */
export function formatAmount(normalized: string, prefix: string): string {
  return `${prefix} ${AMOUNT_FORMAT.format(Number(normalized))}`;
}
