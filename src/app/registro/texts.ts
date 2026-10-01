/**
 * Textos fijos del registro, compartidos por la página, el formulario y su
 * skeleton, para que la silueta de carga diga lo mismo que la pantalla real
 * (spec 6.5). Módulo sin JSX ni "use client": se puede importar desde
 * componentes de servidor y de cliente.
 */

import { withNext } from "../_publico/links";

/**
 * La misma pantalla crea una cuenta nueva o activa la que se creó en la
 * taquilla (sin contraseña). Los enlaces de activación de /ingresar llevan
 * `?modo=activar`, para que quien toca "Activar mi cuenta" llegue a una
 * pantalla que dice eso mismo. Sin el parámetro (o con uno inválido) es la de
 * crear cuenta.
 */
export const REGISTER_MODES = ["crear", "activar"] as const;
export type RegisterMode = (typeof REGISTER_MODES)[number];

/** Nombre del parámetro de búsqueda que elige el modo. */
export const REGISTER_MODE_PARAM = "modo";

/** Textos que cambian según el modo: título, frase, botón, error y pie. */
export const REGISTER_TEXTS = {
  crear: {
    pageTitle: "Crear cuenta",
    title: "Crea tu cuenta",
    description: "Con tu cuenta reservas tus pasajes, pagas y guardas tus tickets.",
    submit: "Crear mi cuenta",
    pending: "Creando tu cuenta…",
    errorTitle: "No pudimos crear tu cuenta",
  },
  activar: {
    pageTitle: "Activar cuenta",
    title: "Activa tu cuenta",
    description: "Escribe tus datos tal como los diste en la taquilla y elige tu contraseña.",
    submit: "Activar mi cuenta",
    pending: "Activando tu cuenta…",
    errorTitle: "No pudimos activar tu cuenta",
  },
} as const satisfies Record<RegisterMode, Record<string, string>>;

/** Enlace a activar una cuenta de taquilla que, al terminar, vuelve a `next`. */
export function activateHref(next?: string | null): string {
  return withNext(`/registro?${REGISTER_MODE_PARAM}=activar`, next);
}

/**
 * Nota de una línea para quien fue registrado en la taquilla y llegó a crear
 * cuenta sin pasar por "Activar mi cuenta". Va al pie, junto a "¿Ya tienes
 * cuenta?": es un caso minoritario y no debe empujar el formulario hacia
 * abajo (spec 1.3). Si los datos no coinciden, el error del registro ya
 * explica qué hacer.
 */
export const COUNTER_NOTICE_TEXT =
  "¿Te registraron en la taquilla? Usa aquí la misma cédula, teléfono y año de nacimiento que diste allí.";

/** Ayuda de la cédula, la misma en ingresar y en registro. */
export const ID_NUMBER_HINT = "La letra y el número, por ejemplo V12345678. Con o sin puntos.";

/**
 * Error de la cédula vacía, el mismo en ingresar y en registro. Reemplaza a la
 * ayuda, así que repite lo que hay que escribir.
 */
export const ID_NUMBER_EMPTY_ERROR = "Escribe tu cédula: la letra y el número, por ejemplo V12345678.";

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
  idNumber: ID_NUMBER_HINT,
  givenNames: "Como aparecen en tu cédula.",
  birthYear: "Solo el año, con cuatro números. Sirve para confirmar que eres tú.",
  phone: "Con el código de área, por ejemplo 0412‑1234567. Aquí te enviaremos los avisos de tu viaje.",
  password: "Mínimo 8 caracteres. Elige una que puedas recordar.",
  confirmPassword: "Escríbela otra vez, para evitar errores.",
} as const;
