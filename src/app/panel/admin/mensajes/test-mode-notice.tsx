import { Alert } from "@/components/alert";
import { getEnv } from "@/lib/env";

/**
 * Aviso de modo de prueba de la bandeja, compartido por la página y su
 * silueta. Solo aparece mientras el canal de WhatsApp es el de prueba
 * (`WHATSAPP_PROVIDER=fake`): con él ningún mensaje sale del sistema, así que
 * los estados de envío, entrega y lectura no los produjo ningún pasajero.
 */
export function TestModeNotice() {
  if (getEnv().WHATSAPP_PROVIDER !== "fake") return null;
  return (
    <Alert tone="info" role="none" title="Modo de prueba">
      Los mensajes todavía no salen por WhatsApp: ningún pasajero los ha recibido. Por eso los estados «Enviado»,
      «Entregado» y «Leído» son simulados. Aquí ves el texto exacto que recibiría cada pasajero.
    </Alert>
  );
}
