import { Alert } from "@/components/alert";
import { SkeletonScreen } from "@/components/skeleton";
import { PageHeaderSkeleton, TabsSkeleton } from "../_shared/skeletons";
import { MESSAGE_TAB_LABELS } from "./messages";
import { MessagesListSkeleton } from "./messages-list";

/**
 * Silueta de la bandeja de mensajes: el aviso de modo de prueba y las
 * pestañas con sus textos reales, y la tabla con sus cabeceras.
 */
export default function MensajesAdminLoading() {
  return (
    <SkeletonScreen label="Cargando los mensajes…" className="flex flex-col gap-6">
      <PageHeaderSkeleton
        title="Mensajes a pasajeros"
        description="Los avisos que el sistema envía a los pasajeros: confirmaciones de reserva, pagos, tickets y recordatorios de viaje."
      />
      <div aria-hidden="true">
        <Alert tone="info" role="none" title="Modo de prueba">
          Por ahora los mensajes no salen por WhatsApp. Aquí ves el texto exacto que recibiría cada pasajero.
        </Alert>
      </div>
      <TabsSkeleton labels={MESSAGE_TAB_LABELS} counts />
      <MessagesListSkeleton />
    </SkeletonScreen>
  );
}
