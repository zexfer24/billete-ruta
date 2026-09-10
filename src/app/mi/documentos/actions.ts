"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { uploadDocument } from "@/modules/accounts";
import { requirePassenger } from "@/modules/auth";
import { ValidationError } from "@/modules/booking/errors";
import { InvalidImageError } from "@/lib/storage";

const tipoSchema = z.enum(["CEDULA", "PERMISO_VIAJE"]);

export async function subirDocumentoAction(formData: FormData): Promise<void> {
  const pasajero = await requirePassenger();

  const tipoParsed = tipoSchema.safeParse(formData.get("type"));
  const archivo = formData.get("file");

  if (!tipoParsed.success) {
    redirect("/mi/documentos?error=" + encodeURIComponent("Tipo de documento inválido."));
  }
  if (!(archivo instanceof File) || archivo.size === 0) {
    redirect("/mi/documentos?error=" + encodeURIComponent("Selecciona un archivo."));
  }

  try {
    const data = Buffer.from(await archivo.arrayBuffer());
    await uploadDocument({
      accountId: pasajero.id,
      type: tipoParsed.data,
      originalName: archivo.name,
      data,
    });
  } catch (error) {
    if (error instanceof ValidationError || error instanceof InvalidImageError) {
      redirect("/mi/documentos?error=" + encodeURIComponent(error.message));
    }
    throw error;
  }

  redirect("/mi/documentos?ok=1");
}
