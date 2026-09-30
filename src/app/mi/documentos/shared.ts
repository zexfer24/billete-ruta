import { z } from "zod";

/**
 * Contrato de URL entre la acción y la página de Documentos. Vive aparte de
 * `actions.ts` porque un archivo `"use server"` solo puede exportar funciones
 * asíncronas.
 */

/** `volver=reservar`: la persona llegó desde el asistente de reserva y puede regresar a él. */
export const volverSchema = z.enum(["reservar"]).optional().catch(undefined);

export type DocumentosVolver = z.infer<typeof volverSchema>;

/** Código de éxito por tipo de documento guardado. */
export const DOCUMENT_OK_CODES = {
  CEDULA: "cedula",
  PERMISO_VIAJE: "permiso",
} as const;

/** Mensaje de éxito de cada código, con el paso siguiente. */
export const DOCUMENT_OK_MESSAGES: Record<string, string> = {
  cedula: "Guardamos la foto de tu cédula.",
  permiso: "Guardamos el permiso de viaje.",
};

/** URL de Documentos con sus avisos, omitiendo los valores vacíos. */
export function documentosUrl(params: { ok?: string; error?: string; volver?: DocumentosVolver }): string {
  const query = new URLSearchParams();
  if (params.volver) query.set("volver", params.volver);
  if (params.ok) query.set("ok", params.ok);
  if (params.error) query.set("error", params.error);
  const text = query.toString();
  return text ? `/mi/documentos?${text}` : "/mi/documentos";
}
