import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ForbiddenError, assertCan, type Permission } from "./permissions";
import {
  PANEL_COOKIE,
  PASSENGER_COOKIE,
  resolvePanelSession,
  resolvePassengerSession,
  type PanelSessionUser,
  type PassengerSessionUser,
} from "./sessions";

/** Usuario de panel con el permiso exigido, o redirección al acceso. */
export async function requirePanelUser(permission: Permission): Promise<PanelSessionUser> {
  const store = await cookies();
  const usuario = await resolvePanelSession(store.get(PANEL_COOKIE)?.value);
  if (!usuario) redirect("/panel/ingresar");
  assertCan(usuario.role, permission);
  return usuario;
}

/** Pasajero con sesión activa, o redirección al acceso. */
export async function requirePassenger(): Promise<PassengerSessionUser> {
  const store = await cookies();
  const cuenta = await resolvePassengerSession(store.get(PASSENGER_COOKIE)?.value);
  if (!cuenta) redirect("/ingresar");
  return cuenta;
}

/** Igual que requirePanelUser pero sin redirigir, para usar en rutas de API. */
export async function currentPanelUser(): Promise<PanelSessionUser | null> {
  const store = await cookies();
  return resolvePanelSession(store.get(PANEL_COOKIE)?.value);
}

export async function currentPassenger(): Promise<PassengerSessionUser | null> {
  const store = await cookies();
  return resolvePassengerSession(store.get(PASSENGER_COOKIE)?.value);
}

/**
 * Agencia sobre la que opera el usuario. El identificador nunca se toma de un
 * formulario: siempre sale de la sesión, para que un operador no pueda actuar
 * sobre datos de otra agencia manipulando la petición.
 */
export function requireAgencyScope(user: PanelSessionUser): string {
  if (user.role === "OPERADOR") {
    if (!user.agencyId) {
      throw new Error("El operador no tiene agencia asignada");
    }
    return user.agencyId;
  }
  throw new ForbiddenError(user.role, "payments.review");
}
