"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { uploadDocument } from "@/modules/accounts";
import { requirePassenger } from "@/modules/auth";
import { ValidationError } from "@/modules/booking/errors";
import { InvalidImageError } from "@/lib/storage";
import { documentosUrl, DOCUMENT_OK_CODES, volverSchema } from "./shared";

const tipoSchema = z.enum(["CEDULA", "PERMISO_VIAJE"]);

/**
 * Guarda la foto de un documento del pasajero. Vuelve a Documentos con
 * `?ok=cedula|permiso` o `?error=<mensaje>`, y conserva `volver=reservar`
 * para ofrecer el regreso al asistente de reserva. La redirección va fuera
 * del `try` para no confundirla con un error.
 */
export async function subirDocumentoAction(formData: FormData): Promise<void> {
  const pasajero = await requirePassenger();

  const volver = volverSchema.parse(formData.get("volver") ?? undefined);
  const tipoParsed = tipoSchema.safeParse(formData.get("type"));
  const archivo = formData.get("file");

  if (!tipoParsed.success) {
    redirect(documentosUrl({ error: "No reconocimos el tipo de documento. Vuelve a intentarlo.", volver }));
  }
  if (!(archivo instanceof File) || archivo.size === 0) {
    redirect(documentosUrl({ error: "Elige una foto antes de guardar.", volver }));
  }

  let error: string | null = null;
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
      error = "Ese archivo no es una foto. Elige una imagen JPG, PNG o WebP.";
    } else if (caught instanceof ValidationError) {
      error = caught.message;
    } else {
      throw caught;
    }
  }

  if (error) {
    redirect(documentosUrl({ error, volver }));
  }
  redirect(documentosUrl({ ok: DOCUMENT_OK_CODES[tipoParsed.data], volver }));
}
