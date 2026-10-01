/**
 * Textos fijos del registro, compartidos por la página, el formulario y su
 * skeleton, para que la silueta de carga diga lo mismo que la pantalla real
 * (spec 6.5). Módulo sin JSX ni "use client": se puede importar desde
 * componentes de servidor y de cliente.
 */

export const REGISTER_TITLE = "Crea tu cuenta";
export const REGISTER_DESCRIPTION = "Con tu cuenta reservas tus pasajes, pagas y guardas tus tickets.";

/**
 * Nota de una línea para quien fue registrado en la taquilla. Va al pie, junto
 * a "¿Ya tienes cuenta?": es un caso minoritario y no debe empujar el
 * formulario hacia abajo (spec 1.3). Si los datos no coinciden, el error del
 * registro ya explica qué hacer.
 */
export const COUNTER_NOTICE_TEXT =
  "¿Te registraron en la taquilla? Usa aquí la misma cédula, teléfono y año de nacimiento que diste allí.";

/** Títulos de los tres grupos del formulario. */
export const REGISTER_GROUPS = {
  datos: "Tus datos",
  avisos: "Cómo te avisamos",
  acceso: "Tu acceso",
} as const;

/**
 * Ayudas de los campos. El ejemplo del teléfono lleva un guion que no se
 * corta (U+2011) para que "0412‑1234567" no quede partido en dos líneas.
 */
export const REGISTER_HINTS = {
  idNumber: "La letra y el número, por ejemplo V12345678. Con o sin puntos.",
  givenNames: "Como aparecen en tu cédula.",
  birthYear: "Solo el año, con cuatro números. Sirve para confirmar que eres tú.",
  phone: "Con el código de área, por ejemplo 0412‑1234567. Aquí te enviaremos los avisos de tu viaje.",
  password: "Mínimo 8 caracteres. Elige una que puedas recordar.",
  confirmPassword: "Escríbela otra vez, para evitar errores.",
} as const;
