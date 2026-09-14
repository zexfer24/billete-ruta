import { prisma } from "@/lib/prisma";
import { isTemplateKey, renderStoredPreview } from "./templates";

export interface PassengerMessage {
  id: string;
  templateKey: string;
  /** renderStoredPreview(templateKey, payload), o el propio templateKey si no es una plantilla conocida. */
  text: string;
  /** MessageStatus. */
  status: string;
  createdAt: Date;
  sentAt: Date | null;
  reservationCode: string | null;
}

/** Convierte el payload JSON del mensaje a un mapa de valores de texto seguro para renderPreview. */
function payloadToParams(payload: unknown): Record<string, string> {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) return {};
  const params: Record<string, string> = {};
  for (const [clave, valor] of Object.entries(payload as Record<string, unknown>)) {
    params[clave] = typeof valor === "string" ? valor : String(valor);
  }
  return params;
}

/** Bandeja de mensajes de un pasajero, del más reciente al más antiguo. */
export async function listMessagesForPhone(phone: string, limit = 50): Promise<PassengerMessage[]> {
  const mensajes = await prisma.outboundMessage.findMany({
    where: { phone },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { reservation: { select: { code: true } } },
  });

  return mensajes.map((mensaje) => {
    const texto = isTemplateKey(mensaje.templateKey)
      ? renderStoredPreview(mensaje.templateKey, payloadToParams(mensaje.payload))
      : mensaje.templateKey;
    return {
      id: mensaje.id,
      templateKey: mensaje.templateKey,
      text: texto,
      status: mensaje.status,
      createdAt: mensaje.createdAt,
      sentAt: mensaje.sentAt,
      reservationCode: mensaje.reservation?.code ?? null,
    };
  });
}
