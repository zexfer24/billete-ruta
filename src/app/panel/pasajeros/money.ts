/**
 * El equivalente en dólares de un monto solo aporta algo cuando la moneda no
 * va 1:1 con el dólar: USD y USDT se muestran solos, sin repetir la cifra.
 * Así se escribe siempre igual ("Equivale a $ X") en la lista, en el panel
 * lateral del comprobante y en el detalle de la reserva.
 */
export function showsUsdEquivalent(currency: string): boolean {
  return currency !== "USD" && currency !== "USDT";
}
