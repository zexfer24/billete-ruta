"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePassenger } from "@/modules/auth";
import { submitProof } from "@/modules/payments";
import { NotOwnerError, ValidationError } from "@/modules/booking/errors";
import { assertImageBuffer, InvalidImageError, MAX_IMAGE_BYTES, saveUpload } from "@/lib/storage";
import { prisma } from "@/lib/prisma";

const currencySchema = z.enum(["USD", "VES", "COP", "USDT"]);

const proofSchema = z.object({
  reservationId: z.string().min(1),
  paymentMethodId: z.string().min(1),
  amount: z.string().min(1),
  currency: currencySchema,
  reference: z.string().min(4, "La referencia debe tener al menos 4 caracteres."),
});

export interface SubirComprobanteState {
  error: string | null;
  success: boolean;
}

export async function subirComprobanteAction(
  _prevState: SubirComprobanteState,
  formData: FormData,
): Promise<SubirComprobanteState> {
  const pasajero = await requirePassenger();

  const parsed = proofSchema.safeParse({
    reservationId: formData.get("reservationId"),
    paymentMethodId: formData.get("paymentMethodId"),
    amount: formData.get("amount"),
    currency: formData.get("currency"),
    reference: formData.get("reference"),
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Revisa los datos del comprobante.",
      success: false,
    };
  }

  const archivo = formData.get("image");
  if (!(archivo instanceof File) || archivo.size === 0) {
    return { error: "Adjunta la imagen del comprobante.", success: false };
  }

  const reserva = await prisma.reservation.findUnique({
    where: { id: parsed.data.reservationId },
    select: { id: true, accountId: true, code: true },
  });
  if (!reserva || reserva.accountId !== pasajero.id) {
    return { error: "Esta reserva no pertenece a tu cuenta.", success: false };
  }

  try {
    const data = Buffer.from(await archivo.arrayBuffer());
    if (data.length > MAX_IMAGE_BYTES) {
      return { error: "La imagen no puede pesar más de 5 MB.", success: false };
    }
    assertImageBuffer(data);
    const imagePath = await saveUpload("comprobantes", pasajero.id, archivo.name, data);

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
    if (
      error instanceof ValidationError ||
      error instanceof NotOwnerError ||
      error instanceof InvalidImageError
    ) {
      return { error: error.message, success: false };
    }
    throw error;
  }

  revalidatePath(`/mi/reservas/${reserva.code}`);
  return { error: null, success: true };
}
