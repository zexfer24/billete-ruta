import { safeNext } from "@/lib/safe-next";

/**
 * Enlaces de las pantallas públicas (portada, ingresar, registro y lista de
 * espera). Funciones puras: la ruta de retorno `next` siempre pasa por
 * `safeNext`, así que un valor manipulado nunca llega a un enlace.
 */

/** Primer valor de un parámetro de búsqueda que puede venir repetido (`?next=a&next=b`). */
export function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

/** Agrega `next` a una ruta, solo si es una ruta interna válida. */
export function withNext(path: string, next: string | null | undefined): string {
  const destino = safeNext(next);
  if (!destino) return path;
  const separador = path.includes("?") ? "&" : "?";
  return `${path}${separador}next=${encodeURIComponent(destino)}`;
}

/** Enlace a ingresar que, al terminar, vuelve a `next`. */
export function loginHref(next?: string | null): string {
  return withNext("/ingresar", next);
}

/** Enlace a crear (o activar) cuenta que, al terminar, vuelve a `next`. */
export function registerHref(next?: string | null): string {
  return withNext("/registro", next);
}

/**
 * A dónde va la persona al terminar de crear o activar su cuenta: a `next` si
 * venía de reservar una salida; si no, a subir la foto de su cédula cuando le
 * falta (el paso que necesita para poder reservar), o al inicio de `/mi`
 * cuando ya la tiene, como pasa al activar una cuenta creada en la taquilla.
 */
export function afterRegisterHref(next: string | null | undefined, needsIdPhoto: boolean): string {
  return safeNext(next) ?? (needsIdPhoto ? "/mi/documentos" : "/mi");
}

/**
 * Enlace a una pantalla de `/mi`: directo si hay sesión, o pasando antes por
 * ingresar (con la pantalla como `next`) si no la hay.
 */
export function passengerHref(path: string, loggedIn: boolean): string {
  return loggedIn ? path : loginHref(path);
}

/** Clase de un enlace de texto de las pantallas públicas: morado, subrayado y con 44 px de alto. */
export const PUBLIC_TEXT_LINK_CLASS =
  "foco inline-flex min-h-11 items-center rounded-control px-1 font-semibold text-marca-700 underline decoration-marca-200 decoration-2 underline-offset-4 transition-colors duration-150 ease-out hover:decoration-marca-600 motion-reduce:transition-none";
