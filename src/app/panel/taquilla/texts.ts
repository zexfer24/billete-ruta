/**
 * Textos fijos de la taquilla que comparten la página y su silueta de carga
 * (`loading.tsx`), para que el título y la ayuda no cambien al terminar de
 * cargar. Un `page.tsx` de Next solo puede exportar lo que Next reconoce, por
 * eso viven aquí.
 */

/** Frase de ayuda de la cabecera de la taquilla. */
export const TAQUILLA_DESCRIPTION =
  "Vende un pasaje en el mostrador en cuatro pasos. Se cobra en efectivo y el ticket sale en el acto.";

/** Los cuatro pasos del asistente, empezando en 1 como el texto "Paso 1 de 4". */
export type CounterStep = 1 | 2 | 3 | 4;

/** Nombres cortos de los pasos, visibles en el `Stepper`. */
export const COUNTER_STEP_LABELS = ["Salida", "Titular", "Otros pasajeros", "Cobro"] as const;

/** Pregunta de cada paso: es el título (h2) que recibe el foco al avanzar. */
export const COUNTER_STEP_TITLES: Record<CounterStep, string> = {
  1: "¿En qué salida viaja?",
  2: "¿Quién es el titular?",
  3: "¿Viaja alguien más?",
  4: "Cobra el pasaje",
};

/** Qué hacer en cada paso, en una frase bajo el título. */
export const COUNTER_STEP_HINTS: Record<CounterStep, string> = {
  1: "Elige la salida y pulsa «Continuar».",
  2: "Busca al titular por su cédula. Si no tiene cuenta, escribe sus datos.",
  3: "Agrega a los acompañantes, si los hay, y confirma que el pasajero aceptó las políticas.",
  4: "Cobra el total en efectivo y entrega el vuelto.",
};
