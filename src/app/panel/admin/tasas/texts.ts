/** Textos fijos de la pantalla de tasas, compartidos por la página y su silueta de carga. */

/**
 * Título de la pantalla (el `h1`, la pestaña del navegador y la silueta).
 * Aquí no hay precios: las tarifas las fija cada agencia.
 */
export const PAGE_TITLE = "Tasas del terminal";

/** Frase de la cabecera, compartida con la silueta de carga. */
export const PAGE_DESCRIPTION =
  "La tasa de salida que paga cada pasajero y las tasas de cambio para cobrar en bolívares y en pesos. Un cambio solo aplica a las reservas nuevas: las que ya existen mantienen su precio.";

/**
 * Ayuda visible bajo cada campo de monto, con un ejemplo de su moneda: la
 * regla del formato queda a la vista de quien escribe la tasa, no en la
 * cabecera de la página.
 */
export function amountHint(example: string): string {
  return `Con coma para los decimales y sin puntos de miles. Ejemplo: ${example}`;
}
