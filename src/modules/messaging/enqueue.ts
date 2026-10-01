import { Prisma } from "@prisma/client";
import type { TemplateKey } from "./templates";
import { STORED_TEXT_KEY, renderPreview, templateParams } from "./templates";

export interface EnqueueInput {
  reservationId?: string | null;
  waitlistEntryId?: string | null;
  phone: string;
  templateKey: TemplateKey;
  payload: Record<string, string>;
  scheduledFor?: Date;
}

/**
 * Encola un mensaje. Si la plantilla es de las que se envían una sola vez por
 * reserva, el índice único parcial rechaza el duplicado y aquí se ignora en
 * silencio: que un barrido corra dos veces no debe molestar al pasajero.
 */
export async function enqueueMessage(
  tx: Prisma.TransactionClient,
  input: EnqueueInput,
): Promise<void> {
  const faltantes = templateParams(input.templateKey).filter(
    (p) => input.payload[p] === undefined,
  );
  if (faltantes.length > 0) {
    throw new Error(
      `Faltan parámetros para ${input.templateKey}: ${faltantes.join(", ")}`,
    );
  }
  try {
    await tx.outboundMessage.create({
      data: {
        reservationId: input.reservationId ?? null,
        waitlistEntryId: input.waitlistEntryId ?? null,
        phone: input.phone,
        templateKey: input.templateKey,
        // Se guarda también el texto exacto, para que la bandeja muestre lo
        // que se envió aunque la plantilla cambie después.
        payload: {
          ...input.payload,
          [STORED_TEXT_KEY]: renderPreview(input.templateKey, input.payload),
        } as Prisma.InputJsonValue,
        status: "ENCOLADO",
        scheduledFor: input.scheduledFor ?? new Date(),
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return;
    throw error;
  }
}
