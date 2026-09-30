"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  PANEL_COOKIE,
  checkLoginRate,
  clearLoginRate,
  createPanelSession,
  verifyPassword,
} from "@/modules/auth";

const schema = z.object({
  email: z.string().trim().min(1),
  password: z.string().min(1),
});

/**
 * Estado del formulario de acceso: un mensaje de error genérico (nunca dice
 * si el correo existe) y el correo escrito, para no obligar a escribirlo de
 * nuevo tras un error.
 */
export interface PanelLoginState {
  error?: string;
  email?: string;
}

/** Mensaje único para correo o contraseña incorrectos, en lenguaje llano (spec 8). */
const CREDENCIALES_INCORRECTAS = "El correo o la contraseña no coinciden. Revísalos e intenta de nuevo.";

export async function loginAction(_prev: PanelLoginState, formData: FormData): Promise<PanelLoginState> {
  const emailEscrito = typeof formData.get("email") === "string" ? String(formData.get("email")).trim() : "";
  const parsed = schema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: "Escribe tu correo y tu contraseña para entrar.", email: emailEscrito };
  }

  const email = parsed.data.email.toLowerCase();
  const rateKey = `panel:${email}`;

  if (!checkLoginRate(rateKey)) {
    return {
      error: "Hubo demasiados intentos con este correo. Espera unos minutos e intenta de nuevo.",
      email: emailEscrito,
    };
  }

  const usuario = await prisma.panelUser.findUnique({ where: { email } });
  if (!usuario || !usuario.active) {
    return { error: CREDENCIALES_INCORRECTAS, email: emailEscrito };
  }

  const valido = await verifyPassword(usuario.passwordHash, parsed.data.password);
  if (!valido) {
    return { error: CREDENCIALES_INCORRECTAS, email: emailEscrito };
  }

  clearLoginRate(rateKey);
  await prisma.panelUser.update({ where: { id: usuario.id }, data: { lastLoginAt: new Date() } });

  const { token, expiresAt } = await createPanelSession(usuario.id);
  const store = await cookies();
  store.set(PANEL_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });

  redirect(usuario.role === "ADMIN" ? "/panel/admin/tablero" : "/panel");
}
