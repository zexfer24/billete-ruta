import { IconSearch } from "@/components/icons";
import { PANEL_LABEL_CLASS } from "@/components/panel-ui";
import { SkeletonScreen } from "@/components/skeleton";
import { SearchLayout } from "../_shared/search-layout";
import { ButtonSkeleton, InputSkeleton, PageHeaderSkeleton, TabsSkeleton } from "../_shared/skeletons";
import { MESSAGE_TAB_LABELS } from "./messages";
import { MessagesListSkeleton } from "./messages-list";
import { MESSAGE_SEARCH_LABEL, MessageSearchExamples } from "./search-examples";
import { TestModeNotice } from "./test-mode-notice";

/**
 * Silueta de la bandeja de mensajes: el aviso de modo de prueba, el buscador
 * con su etiqueta y sus ejemplos reales (el campo y el botón con el brillo de
 * carga), las pestañas con sus textos reales y la tabla con sus cabeceras.
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
      <div
        aria-hidden="true"
        className="flex flex-col gap-1.5 rounded-tarjeta border border-borde bg-superficie p-4 shadow-1"
      >
        <p className={PANEL_LABEL_CLASS}>{MESSAGE_SEARCH_LABEL}</p>
        <SearchLayout
          field={<InputSkeleton className="min-w-0 flex-1" />}
          hint={<MessageSearchExamples />}
          actions={
            <ButtonSkeleton className="flex-1 sm:flex-none">
              <IconSearch className="size-5 shrink-0" />
              Buscar
            </ButtonSkeleton>
          }
        />
      </div>
      <TabsSkeleton labels={MESSAGE_TAB_LABELS} counts />
      <MessagesListSkeleton />
    </SkeletonScreen>
  );
}
