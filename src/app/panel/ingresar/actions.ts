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

/** Estado del formulario de acceso: solo un mensaje de error genérico. */
export async function loginAction(
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  const parsed = schema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: "Credenciales inválidas" };
  }

  const email = parsed.data.email.toLowerCase();
  const rateKey = `panel:${email}`;

  if (!checkLoginRate(rateKey)) {
    return { error: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo." };
  }

  const usuario = await prisma.panelUser.findUnique({ where: { email } });
  if (!usuario || !usuario.active) {
    return { error: "Credenciales inválidas" };
  }

  const valido = await verifyPassword(usuario.passwordHash, parsed.data.password);
  if (!valido) {
    return { error: "Credenciales inválidas" };
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
