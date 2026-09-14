import { ZodError } from "zod";
import { ForbiddenError } from "@/modules/auth";
import {
  DepartureClosedError,
  InvalidTransitionError,
  NoSeatsAvailableError,
  NotOwnerError,
  ValidationError,
} from "@/modules/booking";

/**
 * Traduce un error conocido del dominio a un mensaje en español para mostrar
 * en el panel. Devuelve `null` para cualquier otro error: la acción debe
 * relanzarlo en vez de tragarlo, porque no sabe cómo explicárselo al usuario.
 *
 * Sin `"use server"`: un archivo de acciones de servidor solo puede exportar
 * funciones asíncronas, y estas son síncronas.
 */
export function userFacingMessage(error: unknown): string | null {
  if (
    error instanceof ValidationError ||
    error instanceof NoSeatsAvailableError ||
    error instanceof DepartureClosedError ||
    error instanceof NotOwnerError
  ) {
    return error.message;
  }
  if (error instanceof InvalidTransitionError) {
    return "La reserva ya no admite este cambio.";
  }
  if (error instanceof ForbiddenError) {
    return "No tienes permiso para esta operación.";
  }
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "Datos inválidos.";
  }
  return null;
}

/**
 * Arma la URL de retorno de una acción del panel, omitiendo los valores
 * vacíos o indefinidos. Sin parámetros devuelve solo la ruta.
 */
export function panelFeedbackUrl(
  path: string,
  params: Record<string, string | number | undefined | null>,
): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    query.set(key, String(value));
  }
  const qs = query.toString();
  return qs ? `${path}?${qs}` : path;
}
