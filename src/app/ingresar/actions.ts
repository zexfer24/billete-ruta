"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { loginAccount } from "@/modules/accounts";
import { checkLoginRate, PASSENGER_COOKIE } from "@/modules/auth";
import { normalizeIdNumber } from "@/lib/identity";

export interface IngresarFormState {
  error: string | null;
}

const ingresarSchema = z.object({
  idNumber: z.string().min(1, "Ingresa tu cédula."),
  password: z.string().min(1, "Ingresa tu contraseña."),
});

export async function ingresarAction(
  _prevState: IngresarFormState,
  formData: FormData,
): Promise<IngresarFormState> {
  const parsed = ingresarSchema.safeParse({
    idNumber: formData.get("idNumber"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: "Ingresa tu cédula y tu contraseña." };
  }

  const clave = `pasajero:${normalizeIdNumber(parsed.data.idNumber)}`;
  if (!checkLoginRate(clave)) {
    return { error: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo." };
  }

  const sesion = await loginAccount(parsed.data.idNumber, parsed.data.password);
  if (!sesion) {
    return { error: "Credenciales inválidas." };
  }

  const store = await cookies();
  store.set(PASSENGER_COOKIE, sesion.token, {
    httpOnly: true,
    sameSite: "lax",
    expires: sesion.expiresAt,
    path: "/",
  });

  redirect("/mi/reservar");
}
