import type { MessageStatus } from "@prisma/client";
import type { TemplateKey } from "./templates";

export interface SendResult {
  providerMessageId: string;
}

export interface InboundEventParsed {
  providerEventId: string;
  phone: string;
  type: "button" | "status" | "text";
  buttonPayload?: string;
  messageStatus?: MessageStatus;
  providerMessageId?: string;
  raw: unknown;
}

/**
 * Contrato del canal de mensajería. El MVP usa la implementación falsa; la real
 * contra la Meta Cloud API se añade sin tocar el resto del sistema.
 */
export interface WhatsAppProvider {
  sendTemplate(
    to: string,
    template: TemplateKey,
    params: Record<string, string>,
  ): Promise<SendResult>;
  sendDocument(
    to: string,
    filePath: string,
    filename: string,
    caption?: string,
  ): Promise<SendResult>;
  verifyWebhookSignature(rawBody: Buffer, signatureHeader: string): boolean;
  parseWebhook(body: unknown): InboundEventParsed[];
}
