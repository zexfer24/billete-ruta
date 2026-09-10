import { randomUUID } from "node:crypto";
import type { InboundEventParsed, SendResult, WhatsAppProvider } from "./provider";
import type { TemplateKey } from "./templates";

export interface FakeSentMessage {
  to: string;
  template?: TemplateKey;
  params?: Record<string, string>;
  filePath?: string;
  filename?: string;
  caption?: string;
  at: Date;
}

/**
 * Proveedor de desarrollo y pruebas. No sale a la red: registra los envíos en
 * memoria y deja el rastro en la base para que el panel muestre la bandeja.
 */
export class FakeWhatsAppProvider implements WhatsAppProvider {
  readonly sent: FakeSentMessage[] = [];
  private failures = 0;

  /** Hace fallar los siguientes n envíos, para probar los reintentos. */
  failNextN(n: number): void {
    this.failures = n;
  }

  reset(): void {
    this.sent.length = 0;
    this.failures = 0;
  }

  private consumeFailure(): void {
    if (this.failures > 0) {
      this.failures -= 1;
      throw new Error("Fallo simulado del proveedor de WhatsApp");
    }
  }

  async sendTemplate(
    to: string,
    template: TemplateKey,
    params: Record<string, string>,
  ): Promise<SendResult> {
    this.consumeFailure();
    this.sent.push({ to, template, params, at: new Date() });
    return { providerMessageId: `fake-${randomUUID()}` };
  }

  async sendDocument(
    to: string,
    filePath: string,
    filename: string,
    caption?: string,
  ): Promise<SendResult> {
    this.consumeFailure();
    this.sent.push({ to, filePath, filename, caption, at: new Date() });
    return { providerMessageId: `fake-${randomUUID()}` };
  }

  verifyWebhookSignature(): boolean {
    return true;
  }

  parseWebhook(): InboundEventParsed[] {
    return [];
  }
}

let instancia: FakeWhatsAppProvider | undefined;

export function getFakeProvider(): FakeWhatsAppProvider {
  instancia ??= new FakeWhatsAppProvider();
  return instancia;
}
