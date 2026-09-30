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
 * que pertenecen. Los demás (cuenta existente, datos de taquilla que no
 * coinciden, demasiados intentos) se muestran arriba del formulario.
 */
const REGISTER_DOMAIN_FIELDS: ReadonlyArray<readonly [string, RegisterField]> = [
  ["La cédula no tiene un formato válido.", "idNumber"],
  ["Escribe tus nombres.", "givenNames"],
  ["Escribe tus apellidos.", "surnames"],
  ["El número de teléfono no es válido.", "phone"],
  ["El año de nacimiento no es válido.", "birthYear"],
  ["La contraseña debe tener al menos 8 caracteres.", "password"],
];

/** Campo al que pertenece un error de dominio del registro, o `null` si es general. */
export function registerDomainErrorField(message: string): RegisterField | null {
  return REGISTER_DOMAIN_FIELDS.find(([texto]) => texto === message)?.[1] ?? null;
}

/** El error de dominio avisa que la cédula ya tiene una cuenta con contraseña. */
export function isExistingAccountError(message: string): boolean {
  return message.startsWith("Ya existe una cuenta con la cédula");
}
