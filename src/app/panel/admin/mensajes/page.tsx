import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { z } from "zod";
import { GetForm, GetSubmitButton } from "@/app/panel/_shared/get-form";
import { IconSearch } from "@/components/icons";
import {
  EmptyState,
  PANEL_LABEL_CLASS,
  PanelPageHeader,
  panelButtonClass,
  panelInputClass,
  type PanelTab,
} from "@/components/panel-ui";
import { MESSAGE_STATUS_LABELS } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { requirePanelUser } from "@/modules/auth";
import { AdminTabs } from "../_shared/admin-tabs";
import { MAX_SEARCH_LENGTH, cleanSearch, pageFromParam } from "../_shared/format";
import { withQuery } from "../_shared/period";
import { MESSAGES_PATH, MESSAGE_STATUSES, messageSearchFromQuery, messageStatusFromParam } from "./messages";
import { MessagesList, MessagesListSkeleton } from "./messages-list";
import { MESSAGE_SEARCH_LABEL, MessageSearchExamples } from "./search-examples";
import { auditMessageSearch, messageWhere } from "./search";
import { TestModeNotice } from "./test-mode-notice";

/** Parámetros de la URL. Nunca lanza: un valor repetido o raro cae al valor por defecto. */
const searchParamsSchema = z.object({
  q: z.string().optional().catch(undefined),
  status: z.string().optional().catch(undefined),
  page: z.string().optional().catch(undefined),
});

export const metadata: Metadata = { title: "Mensajes a pasajeros" };

/**
 * Bandeja de mensajes a pasajeros. En el MVP el proveedor de WhatsApp es de
 * prueba: aquí se ve el texto exacto de cada mensaje y su estado, y el aviso
 * de modo de prueba dice que esos estados son simulados. Pestañas por estado
 * con su contador (`?status=`), páginas de 25 (`?page=`) y búsqueda de un
 * pasajero por teléfono, cédula o código de reserva (`?q=`). Buscar a una
 * persona queda registrado en la bitácora, como en Usuarios.
 */
export default async function MensajesAdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePanelUser("terminal.messages");
  const parsed = searchParamsSchema.safeParse(await searchParams);
  const params = parsed.success ? parsed.data : {};
  const query = cleanSearch(params.q);
  const search = query ? messageSearchFromQuery(query) : undefined;
  const status = messageStatusFromParam(params.status);
  const page = pageFromParam(params.page);

  const searchForm = (
    // Buscar navega sin recargar el documento, como en Usuarios: el botón
    // muestra la espera y la lista, su silueta (el `<Suspense>` con clave).
    <GetForm
      action={MESSAGES_PATH}
      role="search"
      className="flex flex-col gap-1.5 rounded-tarjeta border border-borde bg-superficie p-4 shadow-1"
    >
      <label htmlFor="q" className={PANEL_LABEL_CLASS}>
        {MESSAGE_SEARCH_LABEL}
      </label>
      <div className="flex flex-wrap gap-2">
        {/* `key`: el campo no es controlado; al cambiar la búsqueda de la URL
            (por ejemplo con "Limpiar búsqueda") se vuelve a montar con su valor. */}
        <input
          key={query ?? ""}
          type="search"
          id="q"
          name="q"
          defaultValue={query ?? ""}
          maxLength={MAX_SEARCH_LENGTH}
          autoComplete="off"
          aria-describedby="q-ayuda"
          className={panelInputClass("min-w-0 flex-1 basis-60")}
        />
        <GetSubmitButton pendingLabel="Buscando…" className={panelButtonClass("primario", "md", "flex-1 sm:flex-none")}>
          <IconSearch className="size-5 shrink-0" />
          Buscar
        </GetSubmitButton>
        {query ? (
          <Link href={MESSAGES_PATH} className={panelButtonClass("fantasma", "md", "flex-1 sm:flex-none")}>
            Limpiar búsqueda
          </Link>
        ) : null}
      </div>
      <MessageSearchExamples id="q-ayuda" />
    </GetForm>
  );

  const header = (
    <>
      <PanelPageHeader
        title="Mensajes a pasajeros"
        description="Los avisos que el sistema envía a los pasajeros: confirmaciones de reserva, pagos, tickets y recordatorios de viaje."
      />
      <TestModeNotice />
      {searchForm}
    </>
  );

  // Lo escrito no es un teléfono, una cédula ni un código: no hay nada que
  // buscar, así que no se consulta nada y se dice qué formatos se aceptan.
  if (query && !search) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <EmptyState
          icon={<IconSearch />}
          title={`“${query}” no parece un teléfono, una cédula ni un código de reserva`}
          description="Escribe el teléfono con su 0 inicial (0412 123 4567), la cédula con o sin letra (V12345678) o el código completo de la reserva (TR-0914-1PAX-SA7D)."
          action={
            <Link href={MESSAGES_PATH} className={panelButtonClass("secundario")}>
              Ver todos los mensajes
            </Link>
          }
        />
      </div>
    );
  }

  const where = search ? await messageWhere(search) : undefined;
  const grouped = await prisma.outboundMessage.groupBy({ by: ["status"], where, _count: { _all: true } });
  const counts = new Map(grouped.map((g) => [g.status, g._count._all]));
  const totalAll = grouped.reduce((sum, g) => sum + g._count._all, 0);
  const total = status ? (counts.get(status) ?? 0) : totalAll;
  if (query) await auditMessageSearch(user.id, query, totalAll);

  const tabs: PanelTab[] = [
    { href: withQuery(MESSAGES_PATH, { q: query }), label: "Todos", count: totalAll, active: !status },
    ...MESSAGE_STATUSES.map((s) => ({
      href: withQuery(MESSAGES_PATH, { q: query, status: s }),
      label: MESSAGE_STATUS_LABELS[s] ?? s,
      count: counts.get(s) ?? 0,
      active: status === s,
    })),
  ];

  return (
    <div className="flex flex-col gap-6">
      {header}

      <AdminTabs label="Estado de los mensajes" tabs={tabs} />

      <Suspense key={`${query ?? ""}|${status ?? "todos"}|${page}`} fallback={<MessagesListSkeleton />}>
        <MessagesList query={query} where={where} status={status} page={page} total={total} />
      </Suspense>
    </div>
  );
}
