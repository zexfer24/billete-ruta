import { getEnv } from "@/lib/env";
import { getFakeProvider } from "./fake-provider";
import type { WhatsAppProvider } from "./provider";

/**
 * Devuelve el canal de mensajería configurado. El MVP solo tiene la
 * implementación falsa; al añadir la real basta con crearla aquí.
 */
export function getWhatsAppProvider(): WhatsAppProvider {
  const env = getEnv();
  if (env.WHATSAPP_PROVIDER === "fake") return getFakeProvider();
  throw new Error(
    "El proveedor 'meta' aún no está implementado. Usa WHATSAPP_PROVIDER=fake en esta versión.",
  );
}
