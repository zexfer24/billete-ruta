"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePassenger } from "@/modules/auth";
import { submitProof } from "@/modules/payments";
import { NotOwnerError, ValidationError } from "@/modules/booking/errors";
import {
  assertImageBuffer,
  deleteUpload,
  InvalidImageError,
  MAX_IMAGE_BYTES,
  saveUpload,
} from "@/lib/storage";
import { prisma } from "@/lib/prisma";

const currencySchema = z.enum(["USD", "VES", "COP", "USDT"]);

const proofSchema = z.object({
  reservationId: z.string().min(1, "No encontramos la reserva. Recarga la página."),
  paymentMethodId: z.string().min(1, "Elige con qué pagaste."),
  // Se acepta coma o punto decimal ("150,50" o "150.50"), con hasta dos decimales.
  amount: z
    .string()
    .trim()
    .min(1, "Escribe cuánto pagaste.")
    .transform((value) => value.replace(",", "."))
    .pipe(z.string().regex(/^\d+(\.\d{1,2})?$/, "Escribe el monto solo con números, por ejemplo 150,50.")),
  currency: currencySchema,
  reference: z.string().trim().min(4, "La referencia debe tener al menos 4 caracteres."),
});

export interface SubirComprobanteState {
  error: string | null;
  success: boolean;
}

/**
 * Registra el comprobante de un pago del pasajero: valida los datos, guarda
 * la imagen y la entrega al módulo de pagos. Si el registro falla después de
 * guardar la imagen, la borra para no dejar archivos huérfanos.
 */
export async function subirComprobanteAction(
  _prevState: SubirComprobanteState,
  formData: FormData,
): Promise<SubirComprobanteState> {
  const pasajero = await requirePassenger();

  const parsed = proofSchema.safeParse({
    reservationId: formData.get("reservationId") ?? "",
    paymentMethodId: formData.get("paymentMethodId") ?? "",
    amount: formData.get("amount") ?? "",
    currency: formData.get("currency"),
    reference: formData.get("reference") ?? "",
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Revisa los datos del comprobante.",
      success: false,
    };
  }

  const archivo = formData.get("image");
  if (!(archivo instanceof File) || archivo.size === 0) {
    return { error: "Adjunta la captura o la foto del pago.", success: false };
  }

  const reserva = await prisma.reservation.findUnique({
    where: { id: parsed.data.reservationId },
    select: { id: true, accountId: true, code: true },
  });
  if (!reserva || reserva.accountId !== pasajero.id) {
    return { error: "Esta reserva no pertenece a tu cuenta.", success: false };
  }

  const data = Buffer.from(await archivo.arrayBuffer());
  if (data.length > MAX_IMAGE_BYTES) {
    return { error: "La imagen no puede pesar más de 5 MB.", success: false };
  }
  try {
    assertImageBuffer(data);
  } catch (error) {
    if (error instanceof InvalidImageError) {
      return { error: "Ese archivo no es una imagen. Elige una captura o foto JPG, PNG o WebP.", success: false };
    }
    throw error;
  }

  const imagePath = await saveUpload("comprobantes", pasajero.id, archivo.name, data);

  try {
    await submitProof({
      reservationId: parsed.data.reservationId,
      accountId: pasajero.id,
      paymentMethodId: parsed.data.paymentMethodId,
      reference: parsed.data.reference,
      amount: parsed.data.amount,
      currency: parsed.data.currency,
      imagePath,
    });
  } catch (error) {
    // El comprobante no quedó registrado: su imagen ya no sirve.
    await deleteUpload(imagePath).catch(() => undefined);
    if (error instanceof ValidationError || error instanceof NotOwnerError) {
      return { error: error.message, success: false };
    }
    throw error;
  }

  revalidatePath(`/mi/reservas/${reserva.code}`);
  return { error: null, success: true };
}
