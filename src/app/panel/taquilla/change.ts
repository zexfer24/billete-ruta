/** Resultado del cálculo de vuelto, siempre en centavos enteros. */
export interface ChangeResult {
  kind: "vuelto" | "faltan" | "invalido";
  cents: number;
}

/**
 * Convierte un monto en texto (con coma o punto decimal) a centavos enteros.
 * Cada monto se redondea por separado antes de restar, para no arrastrar el
 * error de coma flotante de operar directamente con los `number` originales.
 */
function toCents(value: string): number | null {
  const normalizado = value.trim().replace(",", ".");
  if (normalizado === "") return null;
  const numero = Number(normalizado);
  if (!Number.isFinite(numero)) return null;
  return Math.round(numero * 100);
}

/**
 * Calcula el vuelto de un cobro en taquilla, solo para mostrarlo en pantalla:
 * la venta siempre cobra el monto exacto de la cotización, nunca lo recibido.
 */
export function changeFromReceived(received: string, due: string): ChangeResult {
  const recibidoCents = toCents(received);
  const debidoCents = toCents(due);
  if (recibidoCents === null || debidoCents === null) {
    return { kind: "invalido", cents: 0 };
  }

  const diferencia = recibidoCents - debidoCents;
  if (diferencia >= 0) {
    return { kind: "vuelto", cents: diferencia };
  }
  return { kind: "faltan", cents: -diferencia };
}
