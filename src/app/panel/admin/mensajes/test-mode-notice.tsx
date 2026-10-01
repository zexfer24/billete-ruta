import { Alert } from "@/components/alert";
import { getEnv } from "@/lib/env";

/**
 * Aviso de modo de prueba de la bandeja, compartido por la página y su
 * silueta. Solo aparece mientras el canal de WhatsApp es el de prueba
 * (`WHATSAPP_PROVIDER=fake`): con él ningún mensaje sale del sistema, así que
 * los estados de envío, entrega y lectura no los produjo ningún pasajero. Dos
 * frases: en el teléfono, cinco líneas de aviso empujaban la primera tarjeta
 * fuera de la primera pantalla.
 */
export function TestModeNotice() {
  if (getEnv().WHATSAPP_PROVIDER !== "fake") return null;
  return (
    <Alert tone="info" role="none" title="Modo de prueba">
      Los mensajes todavía no salen por WhatsApp. Los estados «Enviado», «Entregado» y «Leído» son simulados.
    </Alert>
  );
}
