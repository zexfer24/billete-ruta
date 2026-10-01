import { Prisma } from "@prisma/client";
import type { TemplateKey } from "./templates";
import {
  ONCE_PER_RESERVATION_TEMPLATES,
  STORED_TEXT_KEY,
  renderPreview,
  templateParams,
} from "./templates";

export interface EnqueueInput {
  reservationId?: string | null;
  waitlistEntryId?: string | null;
  phone: string;
  templateKey: TemplateKey;
  payload: Record<string, string>;
  scheduledFor?: Date;
}

/**
 * Encola un mensaje y devuelve si lo creó. Si la plantilla es de las que se
 * envían una sola vez por reserva y ese mensaje ya existe, no hace nada y
 * devuelve `false`: que un barrido corra cada 5 minutos no debe molestar al
 * pasajero ni contarse como un envío nuevo. La consulta previa evita que Prisma
 * registre como error un duplicado esperado; el índice único parcial y la
 * captura de P2002 siguen como garantía ante dos escrituras simultáneas.
 */
export async function enqueueMessage(
  tx: Prisma.TransactionClient,
  input: EnqueueInput,
): Promise<boolean> {
  const faltantes = templateParams(input.templateKey).filter(
    (p) => input.payload[p] === undefined,
  );
  if (faltantes.length > 0) {
    throw new Error(
      `Faltan parámetros para ${input.templateKey}: ${faltantes.join(", ")}`,
    );
  }
  const reservationId = input.reservationId ?? null;
  if (reservationId !== null && ONCE_PER_RESERVATION_TEMPLATES.includes(input.templateKey)) {
    const existente = await tx.outboundMessage.findFirst({
      where: { reservationId, templateKey: input.templateKey },
      select: { id: true },
    });
    if (existente) return false;
  }
  try {
    await tx.outboundMessage.create({
      data: {
        reservationId,
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
    return true;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return false;
    throw error;
  }
}
