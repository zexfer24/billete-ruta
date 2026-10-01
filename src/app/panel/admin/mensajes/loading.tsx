import { SkeletonScreen } from "@/components/skeleton";
import { PageHeaderSkeleton, TabsSkeleton } from "../_shared/skeletons";
import { MESSAGE_TAB_LABELS } from "./messages";
import { MessagesListSkeleton } from "./messages-list";
import { TestModeNotice } from "./test-mode-notice";

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
        <TestModeNotice />
      </div>
      <TabsSkeleton labels={MESSAGE_TAB_LABELS} counts />
      <MessagesListSkeleton />
    </SkeletonScreen>
  );
}
