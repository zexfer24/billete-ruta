"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { loginAccount, registerAccount } from "@/modules/accounts";
import { PASSENGER_COOKIE } from "@/modules/auth";
import { ValidationError } from "@/modules/booking/errors";

export interface RegistroFormState {
  error: string | null;
}

const registroSchema = z
  .object({
    idNumber: z.string().min(1, "Ingresa tu cédula."),
    fullName: z.string().min(3, "Escribe tu nombre completo."),
    phone: z.string().min(6, "Ingresa tu número de teléfono."),
    birthYear: z.coerce.number().int("El año de nacimiento no es válido."),
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });

export async function registrarAction(
  _prevState: RegistroFormState,
  formData: FormData,
): Promise<RegistroFormState> {
  const parsed = registroSchema.safeParse({
    idNumber: formData.get("idNumber"),
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    birthYear: formData.get("birthYear"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos del formulario." };
  }

  try {
    await registerAccount({
      idNumber: parsed.data.idNumber,
      fullName: parsed.data.fullName,
      phone: parsed.data.phone,
      birthYear: parsed.data.birthYear,
      password: parsed.data.password,
    });

    const sesion = await loginAccount(parsed.data.idNumber, parsed.data.password);
    if (!sesion) {
      return {
        error: "La cuenta se creó, pero no fue posible iniciar sesión. Intenta ingresar.",
      };
    }

    const store = await cookies();
    store.set(PASSENGER_COOKIE, sesion.token, {
      httpOnly: true,
      sameSite: "lax",
      expires: sesion.expiresAt,
      path: "/",
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return { error: error.message };
    }
    throw error;
  }

  redirect("/mi/documentos");
}
