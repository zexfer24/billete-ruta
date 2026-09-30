/**
 * Textos fijos del registro, compartidos por la página, el formulario y su
 * skeleton, para que la silueta de carga diga lo mismo que la pantalla real
 * (spec 6.5). Módulo sin JSX ni "use client": se puede importar desde
 * componentes de servidor y de cliente.
 */

export const REGISTER_TITLE = "Crea tu cuenta";
export const REGISTER_DESCRIPTION = "Con tu cuenta reservas tus pasajes, pagas y guardas tus tickets.";

export const COUNTER_NOTICE_TITLE = "¿Te registraron en la taquilla?";
export const COUNTER_NOTICE_TEXT =
  "Llena este mismo formulario con la cédula, el teléfono y el año de nacimiento que diste allí. No se crea otra cuenta: se activa la tuya y eliges tu contraseña.";

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
