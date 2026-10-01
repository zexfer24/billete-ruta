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

/**
 * Las tres tasas, cada una en su propia tarjeta con la misma disposición
 * (vigente y campo lado a lado, historial debajo): así las tres se leen
 * igual y en el teléfono los campos usan todo el ancho, sin un marco dentro
 * de otro. Compartidas con la silueta de carga.
 */
export const RATE_SECTIONS = {
  tax: {
    title: "Tasa de salida",
    description: "La cobra el terminal a cada pasajero, aparte de la tarifa de la agencia.",
    currentLabel: "Vigente, por pasajero",
    fieldLabel: "Nueva tasa de salida, en dólares por pasajero",
    example: "2,50",
  },
  VES: {
    title: "Tasa del bolívar",
    description: "Cuántos bolívares equivalen a un dólar. Convierte los pagos que se hacen en bolívares.",
    currentLabel: "Vigente, por cada dólar",
    fieldLabel: "Nueva tasa, en bolívares por cada dólar",
    example: "36,74",
  },
  COP: {
    title: "Tasa del peso colombiano",
    description: "Cuántos pesos colombianos equivalen a un dólar. Convierte los pagos que se hacen en pesos.",
    currentLabel: "Vigente, por cada dólar",
    fieldLabel: "Nueva tasa, en pesos por cada dólar",
    example: "4012,50",
  },
} as const;
