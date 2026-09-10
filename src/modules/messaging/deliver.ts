import { prisma } from "@/lib/prisma";
import { MAX_SEND_ATTEMPTS, nextRetryDelayMinutes } from "@/modules/scheduler";
import { getWhatsAppProvider } from "./get-provider";
import { isTemplateKey } from "./templates";

const BATCH_SIZE = 50;

export interface DeliveryResult {
  sent: number;
  failed: number;
}

/**
 * Entrega los mensajes vencidos. Un fallo no se pierde: se reprograma con espera
 * creciente y, si se agotan los intentos, la reserva queda marcada para contacto
 * manual y visible en el panel.
 */
export async function deliverPendingMessages(now: Date = new Date()): Promise<DeliveryResult> {
  const pendientes = await prisma.outboundMessage.findMany({
    where: { status: "ENCOLADO", scheduledFor: { lte: now } },
    orderBy: { scheduledFor: "asc" },
    take: BATCH_SIZE,
  });

  const provider = getWhatsAppProvider();
  let sent = 0;
  let failed = 0;

  for (const mensaje of pendientes) {
    if (!isTemplateKey(mensaje.templateKey)) {
      await prisma.outboundMessage.update({
        where: { id: mensaje.id },
        data: {
          status: "FALLIDO",
          lastError: `Plantilla desconocida: ${mensaje.templateKey}`,
          attempts: mensaje.attempts + 1,
        },
      });
      failed += 1;
      continue;
    }

    const payload = (mensaje.payload ?? {}) as Record<string, string>;

    try {
      const resultado = await provider.sendTemplate(mensaje.phone, mensaje.templateKey, payload);

      // El ticket viaja como documento adjunto además del mensaje de texto.
      if (mensaje.templateKey === "ticket_emitido" && mensaje.reservationId) {
        const ticket = await prisma.ticket.findUnique({
          where: { reservationId: mensaje.reservationId },
        });
        if (ticket) {
          await provider.sendDocument(
            mensaje.phone,
            ticket.pdfPath,
            `${payload.serial ?? "ticket"}.pdf`,
            "Tu ticket de viaje",
          );
          await prisma.ticket.update({
            where: { id: ticket.id },
            data: { sentAt: now },
          });
        }
      }

      await prisma.outboundMessage.update({
        where: { id: mensaje.id },
        data: {
          status: "ENVIADO",
          providerMessageId: resultado.providerMessageId,
          sentAt: now,
          attempts: mensaje.attempts + 1,
          lastError: null,
        },
      });
      sent += 1;
    } catch (error) {
      const intentos = mensaje.attempts + 1;
      const motivo = error instanceof Error ? error.message : String(error);

      if (intentos >= MAX_SEND_ATTEMPTS) {
        await prisma.outboundMessage.update({
          where: { id: mensaje.id },
          data: { status: "FALLIDO", attempts: intentos, lastError: motivo },
        });
        if (mensaje.reservationId) {
          await prisma.reservation.update({
            where: { id: mensaje.reservationId },
            data: { manualContactRequired: true },
          });
        }
      } else {
        await prisma.outboundMessage.update({
          where: { id: mensaje.id },
          data: {
            attempts: intentos,
            lastError: motivo,
            scheduledFor: new Date(now.getTime() + nextRetryDelayMinutes(intentos) * 60_000),
          },
        });
      }
      failed += 1;
    }
  }

  return { sent, failed };
}
