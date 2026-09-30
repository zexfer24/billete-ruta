import { PanelPageHeader } from "@/components/panel-ui";
import { Skeleton, SkeletonScreen } from "@/components/skeleton";
import { TabsSkeleton } from "../_shared/skeletons";
import { MessagesListSkeleton } from "./messages-list";

/** Silueta de la bandeja de mensajes: aviso de modo de prueba, pestañas y tabla. */
export default function MensajesAdminLoading() {
  return (
    <SkeletonScreen label="Cargando los mensajes…" className="flex flex-col gap-6">
      <PanelPageHeader
        title="Mensajes a pasajeros"
        description="Los avisos que el sistema envía a los pasajeros: confirmaciones de reserva, pagos, tickets y recordatorios de viaje."
      />
      <Skeleton className="h-20 w-full" />
      <TabsSkeleton widths={["w-24", "w-28", "w-24", "w-28", "w-20", "w-24"]} />
      <MessagesListSkeleton />
    </SkeletonScreen>
  );
}
