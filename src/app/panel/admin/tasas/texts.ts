/** Textos fijos de la pantalla de tasas, compartidos por la página y su silueta de carga. */

/** Frase de la cabecera, compartida con la silueta de carga. */
export const PAGE_DESCRIPTION =
  "La tasa de salida que paga cada pasajero y las tasas de cambio para cobrar en bolívares y en pesos. Un cambio solo aplica a las reservas nuevas: las que ya existen mantienen su precio.";

/**
 * Regla del formato de los montos. Se escribe una sola vez, en la cabecera, y
 * cada campo la enlaza con `aria-describedby` para que el lector de pantalla
 * la lea al llegar a él.
 */
export const AMOUNT_HINT = "Escribe los montos con coma para los decimales y sin puntos de miles.";
export const AMOUNT_HINT_ID = "formato-de-montos";
