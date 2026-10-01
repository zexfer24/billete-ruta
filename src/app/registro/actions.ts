"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { loginAccount, missingDocuments, registerAccount } from "@/modules/accounts";
import { PASSENGER_COOKIE } from "@/modules/auth";
import { ValidationError } from "@/modules/booking/errors";
import {
  fieldErrorsFromIssues,
  formText,
  isExistingAccountError,
  REGISTER_FIELDS,
  registerDomainFieldError,
  type RegisterField,
} from "../_publico/form-errors";
import { afterRegisterHref } from "../_publico/links";

/** Datos que se devuelven al formulario tras un error, para no volver a escribirlos. Nunca las contraseñas. */
export type RegistroValues = Partial<Record<Exclude<RegisterField, "password" | "confirmPassword">, string>>;

export interface RegistroFormState {
  /** Error general, arriba del formulario. */
  error: string | null;
  /** La cuenta ya existe (o ya quedó lista): el aviso ofrece ir a ingresar. */
  errorKind?: "ir-a-ingresar";
  /** Errores junto a su campo. */
  fieldErrors?: Partial<Record<RegisterField, string>>;
  values?: RegistroValues;
  /** Cuenta los envíos con error, para que el aviso se anuncie otra vez aunque repita el texto. */
  attempt?: number;
}

/*
 * Cuando un campo tiene error, el error reemplaza a su ayuda (register-form),
 * así que cada mensaje dice por sí solo qué escribir. El campo vacío se
 * distingue del mal escrito: a quien no escribió nada se le pide el dato, no
 * se le corrige el formato. Como zod informa todas las reglas que fallan y
 * solo se muestra la primera, la regla de "vacío" va antes que la de formato.
 */
const registroSchema = z
  .object({
    idNumber: z.string().trim().min(1, "Escribe tu cédula: la letra y el número, por ejemplo V12345678."),
    givenNames: z.string().trim().min(2, "Escribe tus nombres como aparecen en tu cédula."),
    surnames: z.string().trim().min(2, "Escribe tus apellidos."),
    phone: z
      .string()
      .trim()
      .min(6, "Escribe tu teléfono con el código de área, por ejemplo 0412‑1234567."),
    birthYear: z
      .string()
      .trim()
      .min(1, "Escribe tu año de nacimiento, por ejemplo 1990.")
      .regex(/^\d{4}$/, "Escribe el año con cuatro números, por ejemplo 1990.")
      .transform((valor) => Number.parseInt(valor, 10)),
    password: z
      .string()
      .min(1, "Escribe una contraseña de al menos 8 caracteres.")
      .min(8, "La contraseña debe tener al menos 8 caracteres."),
    confirmPassword: z.string().min(1, "Escribe otra vez tu contraseña."),
    next: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden. Escríbela igual en los dos campos.",
    path: ["confirmPassword"],
  });

export async function registrarAction(
  prevState: RegistroFormState,
  formData: FormData,
): Promise<RegistroFormState> {
  const attempt = (prevState.attempt ?? 0) + 1;
  const values: RegistroValues = {
    idNumber: formText(formData, "idNumber"),
    givenNames: formText(formData, "givenNames"),
    surnames: formText(formData, "surnames"),
    phone: formText(formData, "phone"),
    birthYear: formText(formData, "birthYear"),
  };

  const parsed = registroSchema.safeParse({
    ...values,
    password: formText(formData, "password"),
    confirmPassword: formText(formData, "confirmPassword"),
    next: formText(formData, "next") || undefined,
  });

  if (!parsed.success) {
    return {
      error: null,
      fieldErrors: fieldErrorsFromIssues(parsed.error.issues, REGISTER_FIELDS),
      values,
      attempt,
    };
  }

  let faltaCedula = true;
  try {
    const { accountId } = await registerAccount({
      idNumber: parsed.data.idNumber,
      givenNames: parsed.data.givenNames,
      surnames: parsed.data.surnames,
      phone: parsed.data.phone,
      birthYear: parsed.data.birthYear,
      password: parsed.data.password,
    });

    const sesion = await loginAccount(parsed.data.idNumber, parsed.data.password);
    if (!sesion) {
      return {
        error: "Tu cuenta quedó lista, pero no pudimos abrirla. Ingresa con tu cédula y tu contraseña.",
        errorKind: "ir-a-ingresar",
        values,
        attempt,
      };
    }

    const store = await cookies();
    store.set(PASSENGER_COOKIE, sesion.token, {
      httpOnly: true,
      sameSite: "lax",
      expires: sesion.expiresAt,
      path: "/",
    });

    // Quien activa una cuenta de taquilla ya tiene la foto de la cédula.
    // Si la consulta falla, se va a Documentos, que muestra lo que falte.
    faltaCedula = await missingDocuments(accountId, false)
      .then((faltantes) => faltantes.includes("CEDULA"))
      .catch(() => true);
  } catch (error) {
    if (error instanceof ValidationError) {
      const campo = registerDomainFieldError(error.message);
      if (campo) {
        return { error: null, fieldErrors: { [campo.field]: campo.text }, values, attempt };
      }
      return {
        error: error.message,
        errorKind: isExistingAccountError(error.message) ? "ir-a-ingresar" : undefined,
        values,
        attempt,
      };
    }
    throw error;
  }

  // Quien venía de reservar una salida vuelve a ella; si no, a subir la foto
  // de su cédula si le falta, o al inicio si ya la tiene.
  redirect(afterRegisterHref(parsed.data.next, faltaCedula));
}
