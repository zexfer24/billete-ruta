import { z } from "zod";

/**
 * Contrato de URL entre la acción y la página de Documentos. Vive aparte de
 * `actions.ts` porque un archivo `"use server"` solo puede exportar funciones
 * asíncronas. `?ok=` y `?error=` llevan códigos cortos, nunca texto libre:
 * la página los traduce con un `Record`, así una URL armada a mano no puede
 * mostrar un mensaje inventado dentro de un aviso oficial ni tumbar la
 * pantalla con una clave como `constructor`.
 */

/** `volver=reservar`: la persona llegó desde el asistente de reserva y puede regresar a él. */
export const volverSchema = z.enum(["reservar"]).optional().catch(undefined);

export type DocumentosVolver = z.infer<typeof volverSchema>;

/** Código de cada tipo de documento en la URL (éxito de `?ok=` y documento de `?doc=`). */
export const DOCUMENT_OK_CODES = {
  CEDULA: "cedula",
  PERMISO_VIAJE: "permiso",
} as const;

export type DocumentOkCode = (typeof DOCUMENT_OK_CODES)[keyof typeof DOCUMENT_OK_CODES];

const OK_CODES = Object.values(DOCUMENT_OK_CODES) as [DocumentOkCode, ...DocumentOkCode[]];

/** `?ok=` y `?doc=`: un código de documento conocido, o nada. */
export const documentCodeSchema = z.enum(OK_CODES).optional().catch(undefined);

/** Mensaje de éxito de cada código, con el paso siguiente. */
export const DOCUMENT_OK_MESSAGES: Record<DocumentOkCode, string> = {
  cedula: "Guardamos la foto de tu cédula.",
  permiso: "Guardamos el permiso de viaje.",
};

export const DOCUMENT_ERROR_CODES = ["tipo", "vacio", "formato", "tamano", "revisar"] as const;

export type DocumentErrorCode = (typeof DOCUMENT_ERROR_CODES)[number];

/** `?error=`: un código de error conocido, o nada. */
export const documentErrorSchema = z.enum(DOCUMENT_ERROR_CODES).optional().catch(undefined);

/** Qué pasó y qué hacer, para cada código de error. */
export const DOCUMENT_ERROR_MESSAGES: Record<DocumentErrorCode, string> = {
  tipo: "No reconocimos el tipo de documento. Vuelve a intentarlo.",
  vacio: "Elige una foto antes de guardar.",
  formato: "Ese archivo no es una foto. Elige una imagen JPG, PNG o WebP.",
  tamano: "La foto pesa más de 5 MB. Elige otra o tómala de nuevo con menos resolución.",
  revisar: "No pudimos guardar esa foto. Revísala y vuelve a intentarlo.",
};

/** URL de Documentos con sus avisos, omitiendo los valores vacíos. */
export function documentosUrl(params: {
  ok?: DocumentOkCode;
  error?: DocumentErrorCode;
  /** Documento al que se refiere el error, para dejar abierto su formulario. */
  doc?: DocumentOkCode;
  volver?: DocumentosVolver;
}): string {
  const query = new URLSearchParams();
  if (params.volver) query.set("volver", params.volver);
  if (params.ok) query.set("ok", params.ok);
  if (params.error) query.set("error", params.error);
  if (params.doc) query.set("doc", params.doc);
  const text = query.toString();
  return text ? `/mi/documentos?${text}` : "/mi/documentos";
}
