import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ForbiddenError, can, panelHomeFor, type Permission } from "./permissions";
import {
  PANEL_COOKIE,
  PASSENGER_COOKIE,
  resolvePanelSession,
  resolvePassengerSession,
  type PanelSessionUser,
  type PassengerSessionUser,
} from "./sessions";

/**
 * Resolución de sesión memorizada por valor de la cookie durante un mismo
 * render de servidor: el layout y la página piden la sesión en la misma
 * navegación, y así se consulta (y se actualiza `lastSeenAt`) una sola vez.
 * Fuera del render (acciones de servidor, rutas de API) `cache` no guarda
 * nada y cada llamada consulta de nuevo. Se memoriza el ayudante, no las
 * guardas completas, porque éstas redirigen lanzando y reciben un permiso.
 */
const resolvePanelSessionCached = cache((token: string | undefined) =>
  resolvePanelSession(token),
);

const resolvePassengerSessionCached = cache((token: string | undefined) =>
  resolvePassengerSession(token),
);

async function panelSessionFromCookie(): Promise<PanelSessionUser | null> {
  const store = await cookies();
  return resolvePanelSessionCached(store.get(PANEL_COOKIE)?.value);
}

async function passengerSessionFromCookie(): Promise<PassengerSessionUser | null> {
  const store = await cookies();
  return resolvePassengerSessionCached(store.get(PASSENGER_COOKIE)?.value);
}

/**
 * Usuario de panel con el permiso exigido. Sin sesión, redirige al acceso.
 * Con sesión pero sin el permiso, redirige al inicio de su propio rol en vez
 * de lanzar: un acceso cruzado entre roles no debe romper la pantalla.
 */
export async function requirePanelUser(permission: Permission): Promise<PanelSessionUser> {
  const usuario = await panelSessionFromCookie();
  if (!usuario) redirect("/panel/ingresar");
  if (!can(usuario.role, permission)) redirect(panelHomeFor(usuario.role));
  return usuario;
}

/** Pasajero con sesión activa, o redirección al acceso. */
export async function requirePassenger(): Promise<PassengerSessionUser> {
  const cuenta = await passengerSessionFromCookie();
  if (!cuenta) redirect("/ingresar");
  return cuenta;
}

/** Igual que requirePanelUser pero sin redirigir, para usar en rutas de API. */
export async function currentPanelUser(): Promise<PanelSessionUser | null> {
  return panelSessionFromCookie();
}

export async function currentPassenger(): Promise<PassengerSessionUser | null> {
  return passengerSessionFromCookie();
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

/**
 * Igual que `requirePanelUser` seguido de `requireAgencyScope`, pero para
 * páginas de agencia: si el rol no es OPERADOR (por ejemplo, el admin entra a
 * una página de agencia con `agency.reports`), redirige al inicio de su rol
 * en vez de lanzar. Un operador sin agencia sigue lanzando, porque es un
 * error de configuración y no un acceso cruzado.
 */
export async function requireAgencyUser(
  permission: Permission,
): Promise<{ user: PanelSessionUser; agencyId: string }> {
  const user = await requirePanelUser(permission);
  if (user.role !== "OPERADOR") redirect(panelHomeFor(user.role));
  if (!user.agencyId) throw new Error("El operador no tiene agencia asignada");
  return { user, agencyId: user.agencyId };
}
