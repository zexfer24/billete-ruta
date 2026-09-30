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

/**
 * Frase de "Reservas por cobrar". La cifra cuenta reservas cuya salida aún no
 * parte y que todavía deben dinero (sin pago, con un pago en revisión, abonadas
 * o por pagar en la taquilla). El detalle habla de esas mismas reservas: la
 * parte que paga en la taquilla es un subconjunto exacto de la cifra. Los
 * comprobantes por revisar no van aquí: cuentan comprobantes, no reservas, y ya
 * los muestra el aviso de "Lo que necesita tu atención".
 */
export function porCobrarDetail(total: number, payOnSite: number): string {
  if (total === 0) return "Ninguna reserva debe dinero";
  const base = total === 1 ? "Debe dinero y su salida aún no parte" : "Deben dinero y su salida aún no parte";
  if (payOnSite === 0) return base;
  if (payOnSite === total) {
    return `${base}. ${total === 1 ? "Paga" : "Todas pagan"} en la taquilla.`;
  }
  return `${base}. De ellas, ${countLabel(payOnSite, "paga", "pagan")} en la taquilla.`;
}
