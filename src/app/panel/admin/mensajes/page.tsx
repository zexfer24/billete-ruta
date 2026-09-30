import type { Metadata } from "next";
import { Suspense } from "react";
import { Alert } from "@/components/alert";
import { PanelPageHeader, PanelTabs, type PanelTab } from "@/components/panel-ui";
import { MESSAGE_STATUS_LABELS } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { requirePanelUser } from "@/modules/auth";
import { pageFromParam } from "../_shared/format";
import { withQuery } from "../_shared/period";
import { MESSAGES_PATH, MESSAGE_STATUSES, messageStatusFromParam } from "./messages";
import { MessagesList, MessagesListSkeleton } from "./messages-list";

export const metadata: Metadata = { title: "Mensajes a pasajeros" };

/**
 * Bandeja de mensajes a pasajeros. En el MVP el proveedor de WhatsApp es de
 * prueba: aquí se ve el texto exacto de cada mensaje y su estado. Pestañas
 * por estado con su contador (`?status=`) y páginas de 50 (`?page=`).
 */
export default async function MensajesAdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePanelUser("terminal.messages");
  const params = await searchParams;
  const status = messageStatusFromParam(params.status);
  const page = pageFromParam(typeof params.page === "string" ? params.page : undefined);

  const grouped = await prisma.outboundMessage.groupBy({ by: ["status"], _count: { _all: true } });
  const counts = new Map(grouped.map((g) => [g.status, g._count._all]));
  const totalAll = grouped.reduce((sum, g) => sum + g._count._all, 0);
  const total = status ? (counts.get(status) ?? 0) : totalAll;

  const tabs: PanelTab[] = [
    { href: MESSAGES_PATH, label: "Todos", count: totalAll, active: !status },
    ...MESSAGE_STATUSES.map((s) => ({
      href: withQuery(MESSAGES_PATH, { status: s }),
      label: MESSAGE_STATUS_LABELS[s] ?? s,
      count: counts.get(s) ?? 0,
      active: status === s,
    })),
  ];

  return (
    <div className="flex flex-col gap-6">
      <PanelPageHeader
        title="Mensajes a pasajeros"
        description="Los avisos que el sistema envía a los pasajeros: confirmaciones de reserva, pagos, tickets y recordatorios de viaje."
      />

      <Alert tone="info" role="none" title="Modo de prueba">
        Por ahora los mensajes no salen por WhatsApp. Aquí ves el texto exacto que recibiría cada pasajero.
      </Alert>

      <PanelTabs label="Estado de los mensajes" tabs={tabs} />

      <Suspense key={`${status ?? "todos"}|${page}`} fallback={<MessagesListSkeleton />}>
        <MessagesList status={status} page={page} total={total} />
      </Suspense>
    </div>
  );
}
