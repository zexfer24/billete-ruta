/**
 * Utilidades puras de los formularios públicos (ingresar y registro): leer
 * campos de texto, repartir los errores de validación por campo y ubicar en
 * su campo los errores de dominio conocidos. Viven fuera de los archivos
 * `"use server"`, que solo pueden exportar funciones asíncronas.
 */

/** Valor de texto de un campo; cualquier otra cosa (ausente, archivo) cuenta como vacío. */
export function formText(formData: FormData, name: string): string {
  const valor = formData.get(name);
  return typeof valor === "string" ? valor : "";
}

interface IssueLike {
  path: ReadonlyArray<PropertyKey>;
  message: string;
}

/**
 * Primer mensaje de error por campo, a partir de los `issues` de zod. Así la
 * persona ve todos los campos por corregir de una vez, cada uno junto a su
 * campo, en vez de uno por envío.
 */
export function fieldErrorsFromIssues<F extends string>(
  issues: readonly IssueLike[],
  fields: readonly F[],
): Partial<Record<F, string>> {
  const errores: Partial<Record<F, string>> = {};
  for (const issue of issues) {
    const campo = issue.path[0];
    if (typeof campo !== "string") continue;
    if (!(fields as readonly string[]).includes(campo)) continue;
    const clave = campo as F;
    if (errores[clave] === undefined) errores[clave] = issue.message;
  }
  return errores;
}

/** Campos del formulario de registro. */
export const REGISTER_FIELDS = [
  "idNumber",
  "givenNames",
  "surnames",
  "phone",
  "birthYear",
  "password",
  "confirmPassword",
] as const;

export type RegisterField = (typeof REGISTER_FIELDS)[number];

/**
 * Errores que `registerAccount` lanza sobre un dato concreto, con el campo al
 * que pertenecen y el texto que se muestra junto a él. Los demás (cuenta
 * existente, datos de taquilla que no coinciden, demasiados intentos) se
 * muestran arriba del formulario. Cuando un campo tiene error, el error
 * reemplaza a su ayuda, así que el texto mostrado repite el ejemplo que la
 * ayuda daba.
 */
const REGISTER_DOMAIN_FIELDS: ReadonlyArray<readonly [string, RegisterField, string]> = [
  [
    "La cédula no tiene un formato válido.",
    "idNumber",
    "La cédula no es válida. Escribe la letra y el número, por ejemplo V12345678.",
  ],
  ["Escribe tus nombres.", "givenNames", "Escribe tus nombres como aparecen en tu cédula."],
  ["Escribe tus apellidos.", "surnames", "Escribe tus apellidos."],
  [
    "El número de teléfono no es válido.",
    "phone",
    "El teléfono no es válido. Escríbelo con el código de área, por ejemplo 0412‑1234567.",
  ],
  [
    "El año de nacimiento no es válido.",
    "birthYear",
    "El año de nacimiento no es válido. Escríbelo con cuatro números, por ejemplo 1990.",
  ],
  ["La contraseña debe tener al menos 8 caracteres.", "password", "La contraseña debe tener al menos 8 caracteres."],
];

/** Campo al que pertenece un error de dominio del registro, o `null` si es general. */
export function registerDomainErrorField(message: string): RegisterField | null {
  return registerDomainFieldError(message)?.field ?? null;
}

/** Campo y texto a mostrar de un error de dominio del registro, o `null` si es general. */
export function registerDomainFieldError(message: string): { field: RegisterField; text: string } | null {
  const fila = REGISTER_DOMAIN_FIELDS.find(([texto]) => texto === message);
  return fila ? { field: fila[1], text: fila[2] } : null;
}

/** El error de dominio avisa que la cédula ya tiene una cuenta con contraseña. */
export function isExistingAccountError(message: string): boolean {
  return message.startsWith("Ya existe una cuenta con la cédula");
}
