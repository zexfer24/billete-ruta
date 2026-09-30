/**
 * Textos con número del panel de agencia. Módulo puro (sin React ni Next),
 * compartido por el tablero, "Pasajeros y pagos" y la taquilla, para escribir
 * siempre el singular o el plural correcto según la cantidad (spec, sección 1:
 * nada de "reserva(s)").
 */

/**
 * La cantidad seguida de la palabra en singular o en plural: `1 reserva`,
 * `3 reservas`, `0 reservas`. El número usa punto de miles, como el resto del
 * panel (`1.250 reservas`).
 */
export function countLabel(count: number, singular: string, plural: string): string {
  const numero = new Intl.NumberFormat("es-VE", { maximumFractionDigits: 0 }).format(count);
  return `${numero} ${count === 1 ? singular : plural}`;
}

/**
 * Une frases cortas en una enumeración natural: `a`, `a y b`, `a, b y c`.
 * Descarta las vacías; sin ninguna devuelve una cadena vacía.
 */
export function joinPhrases(parts: ReadonlyArray<string | null | undefined | false>): string {
  const frases = parts.filter((p): p is string => typeof p === "string" && p.length > 0);
  if (frases.length <= 1) return frases[0] ?? "";
  return `${frases.slice(0, -1).join(", ")} y ${frases[frases.length - 1]}`;
}
