"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { uploadDocument } from "@/modules/accounts";
import { requirePassenger } from "@/modules/auth";
import { ValidationError } from "@/modules/booking/errors";
import { InvalidImageError, MAX_IMAGE_BYTES } from "@/lib/storage";
import { documentosUrl, DOCUMENT_OK_CODES, volverSchema, type DocumentErrorCode } from "./shared";

const tipoSchema = z.enum(["CEDULA", "PERMISO_VIAJE"]);

/**
 * Guarda la foto de un documento del pasajero. Vuelve a Documentos con
 * `?ok=cedula|permiso` o `?error=<código>&doc=<documento>` (la página
 * traduce el código a un mensaje), y conserva `volver=reservar` para ofrecer
 * el regreso al asistente de reserva. La redirección va fuera del `try` para
 * no confundirla con un error.
 */
export async function subirDocumentoAction(formData: FormData): Promise<void> {
  const pasajero = await requirePassenger();

  const volver = volverSchema.parse(formData.get("volver") ?? undefined);
  const tipoParsed = tipoSchema.safeParse(formData.get("type"));
  const archivo = formData.get("file");

  if (!tipoParsed.success) {
    redirect(documentosUrl({ error: "tipo", volver }));
  }
  const doc = DOCUMENT_OK_CODES[tipoParsed.data];
  if (!(archivo instanceof File) || archivo.size === 0) {
    redirect(documentosUrl({ error: "vacio", doc, volver }));
  }
  if (archivo.size > MAX_IMAGE_BYTES) {
    redirect(documentosUrl({ error: "tamano", doc, volver }));
  }

  let error: DocumentErrorCode | null = null;
  try {
    const data = Buffer.from(await archivo.arrayBuffer());
    await uploadDocument({
      accountId: pasajero.id,
      type: tipoParsed.data,
      originalName: archivo.name,
      data,
    });
  } catch (caught) {
    if (caught instanceof InvalidImageError) {
      error = "formato";
    } else if (caught instanceof ValidationError) {
      error = "revisar";
    } else {
      throw caught;
    }
  }

  if (error) {
    redirect(documentosUrl({ error, doc, volver }));
  }
  redirect(documentosUrl({ ok: doc, volver }));
}
