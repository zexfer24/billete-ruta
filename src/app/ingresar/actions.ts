"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { loginAccount } from "@/modules/accounts";
import { checkLoginRate, PASSENGER_COOKIE } from "@/modules/auth";
import { normalizeIdNumber } from "@/lib/identity";
import { safeNext } from "@/lib/safe-next";
import { fieldErrorsFromIssues, formText } from "../_publico/form-errors";

export type IngresarField = "idNumber" | "password";

export interface IngresarFormState {
  /** Error general, arriba del formulario (datos que no coinciden, demasiados intentos). */
  error: string | null;
  /** Qué tipo de error general es, para ofrecer el camino que corresponde. */
  errorKind?: "no-coinciden" | "intentos";
  /** Errores junto a su campo. */
  fieldErrors?: Partial<Record<IngresarField, string>>;
  /** Cédula enviada, para no obligar a escribirla de nuevo. La contraseña nunca se devuelve. */
  idNumber?: string;
  /** Cuenta los envíos con error, para que el aviso se anuncie otra vez aunque repita el texto. */
  attempt?: number;
}

const INGRESAR_FIELDS: readonly IngresarField[] = ["idNumber", "password"];

const ingresarSchema = z.object({
  idNumber: z.string().trim().min(1, "Escribe tu cédula."),
  password: z.string().min(1, "Escribe tu contraseña."),
  next: z.string().optional(),
});

export async function ingresarAction(
  prevState: IngresarFormState,
  formData: FormData,
): Promise<IngresarFormState> {
  const attempt = (prevState.attempt ?? 0) + 1;
  const idNumber = formText(formData, "idNumber");
  const parsed = ingresarSchema.safeParse({
    idNumber,
    password: formText(formData, "password"),
    next: formText(formData, "next") || undefined,
  });
  if (!parsed.success) {
    return {
      error: null,
      fieldErrors: fieldErrorsFromIssues(parsed.error.issues, INGRESAR_FIELDS),
      idNumber,
      attempt,
    };
  }

  const clave = `pasajero:${normalizeIdNumber(parsed.data.idNumber)}`;
  if (!checkLoginRate(clave)) {
    return {
      error: "Hiciste demasiados intentos. Espera unos minutos e inténtalo de nuevo.",
      errorKind: "intentos",
      idNumber,
      attempt,
    };
  }

  const sesion = await loginAccount(parsed.data.idNumber, parsed.data.password);
  if (!sesion) {
    return {
      error: "La cédula o la contraseña no coinciden. Revisa e inténtalo de nuevo.",
      errorKind: "no-coinciden",
      idNumber,
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

  redirect(safeNext(parsed.data.next) ?? "/mi");
}
