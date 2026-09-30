import type { MessageStatus } from "@prisma/client";
import Link from "next/link";
import { IconMessage } from "@/components/icons";
import {
  EmptyState,
  PANEL_TD_CLASS,
  PANEL_TH_CLASS,
  StatusBadge,
  TableShell,
  panelButtonClass,
} from "@/components/panel-ui";
import { cx } from "@/components/ui-classes";
import { MESSAGE_STATUS_LABELS, messageStatusTone } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { formatCaracasDateTime24 } from "@/lib/time";
import { isTemplateKey, renderStoredPreview } from "@/modules/messaging";
import { countLabel, formatCount, formatPhone } from "../_shared/format";
import { DISCLOSURE_SUMMARY_CLASS, DisclosureChevron, Pagination } from "../_shared/lists";
import { withQuery } from "../_shared/period";
import { LineSkeleton, TableSkeleton } from "../_shared/skeletons";
import { MESSAGES_PATH, payloadToParams, templateName } from "./messages";

export const MESSAGES_PAGE_SIZE = 50;

/** Cabeceras de la tabla, compartidas con su silueta de carga. */
const MESSAGE_COLUMNS = ["Para", "Mensaje", "Estado", "Enviado"] as const;

/** Diferencia desde la que el envío se considera fuera de la hora programada (un reintento, por ejemplo). */
const SCHEDULE_GAP_MS = 60_000;

/** Con más caracteres que estos, el texto se recorta a dos líneas y se abre con "Ver mensaje completo". */
const LONG_TEXT = 140;

interface MessageRow {
  id: string;
  phone: string;
  name: string;
  text: string;
  status: MessageStatus;
  attempts: number;
  scheduledFor: Date;
  sentAt: Date | null;
  lastError: string | null;
}

function MessageText({ text }: { text: string }) {
  if (text.length <= LONG_TEXT) return <p className="text-sm leading-relaxed text-tinta-suave">{text}</p>;
  return (
    <details className="group">
      <summary className="foco cursor-pointer list-none rounded-control [&::-webkit-details-marker]:hidden">
        <span className="line-clamp-2 text-sm leading-relaxed text-tinta-suave group-open:hidden">{text}</span>
        <span className="mt-1 inline-flex min-h-11 items-center gap-1.5 text-[15px] font-semibold text-marca-700">
          <span className="group-open:hidden">Ver mensaje completo</span>
          <span className="hidden group-open:inline">Ver menos</span>
          <DisclosureChevron />
        </span>
      </summary>
      <p className="text-sm leading-relaxed text-tinta-suave">{text}</p>
    </details>
  );
}

/** Estado del mensaje con su pastilla, los intentos y, si falló, el motivo en llano. */
function MessageStatusBlock({ message }: { message: MessageRow }) {
  return (
    <div className="flex flex-col items-start gap-1.5">
      <StatusBadge
        label={MESSAGE_STATUS_LABELS[message.status] ?? message.status}
        tone={messageStatusTone(message.status)}
      />
      {message.attempts > 1 ? (
        <span className="tabular text-sm text-tinta-suave">
          {countLabel(message.attempts, "intento de envío", "intentos de envío")}
        </span>
      ) : null}
      {message.lastError ? (
        <details className="group">
          <summary className={cx(DISCLOSURE_SUMMARY_CLASS, "text-sm")}>
            {message.status === "FALLIDO" ? "No se pudo entregar" : "Hubo un problema"}
            <DisclosureChevron />
          </summary>
          <p className="max-w-xs break-words text-sm text-tinta-suave">Detalle técnico: {message.lastError}</p>
        </details>
      ) : null}
    </div>
  );
}

/**
 * Cuándo salió el mensaje. La hora programada solo se agrega si todavía no
 * sale o si salió en otro momento (un reintento): casi siempre coinciden y
 * repetirla en cada fila era ruido.
 */
function SendTime({ message }: { message: MessageRow }) {
  const scheduled = formatCaracasDateTime24(message.scheduledFor);
  if (!message.sentAt) {
    return (
      <span className="flex flex-col">
        <span className="text-tinta-suave">{message.status === "FALLIDO" ? "No salió" : "Todavía no"}</span>
        <span className="tabular text-sm text-tinta-suave">Programado para el {scheduled}</span>
      </span>
    );
  }
  const differs = Math.abs(message.sentAt.getTime() - message.scheduledFor.getTime()) >= SCHEDULE_GAP_MS;
  return (
    <span className="flex flex-col">
      <span className="tabular font-medium text-tinta">{formatCaracasDateTime24(message.sentAt)}</span>
      {differs ? <span className="tabular text-sm text-tinta-suave">Programado para el {scheduled}</span> : null}
    </span>
  );
}

/**
 * Lista de mensajes de una página, con el texto real que recibe el pasajero
 * (`renderStoredPreview`, que nunca lanza), el nombre legible de la plantilla
 * y el estado con las etiquetas y tonos de `labels.ts`.
 */
export async function MessagesList({
  status,
  page,
  total,
}: {
  status?: MessageStatus;
  page: number;
  /** Total de mensajes con ese estado, ya contado para las pestañas. */
  total: number;
}) {
  const totalPages = Math.max(1, Math.ceil(total / MESSAGES_PAGE_SIZE));
  const hrefFor = (p: number) => withQuery(MESSAGES_PATH, { status, page: p > 1 ? String(p) : undefined });

  if (total === 0) {
    return (
      <EmptyState
        icon={<IconMessage />}
        title={
          status
            ? `No hay mensajes en “${MESSAGE_STATUS_LABELS[status] ?? status}”`
            : "Todavía no se ha generado ningún mensaje"
        }
        description={
          status
            ? "Cuando un mensaje llegue a ese estado aparecerá aquí."
            : "Los mensajes se crean solos cuando un pasajero reserva, paga o se acerca la hora de su viaje."
        }
        action={
          status ? (
            <Link href={MESSAGES_PATH} className={panelButtonClass("secundario")}>
              Ver todos los mensajes
            </Link>
          ) : undefined
        }
      />
    );
  }

  const messages = await prisma.outboundMessage.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * MESSAGES_PAGE_SIZE,
    take: MESSAGES_PAGE_SIZE,
  });

  if (messages.length === 0) {
    return (
      <EmptyState
        icon={<IconMessage />}
        title="Esta página no tiene mensajes"
        description={`Hay ${countLabel(totalPages, "página", "páginas")} de mensajes.`}
        action={
          <Link href={hrefFor(1)} className={panelButtonClass("secundario")}>
            Ir a la primera página
          </Link>
        }
      />
    );
  }

  const rows: MessageRow[] = messages.map((m) => ({
    id: m.id,
    phone: formatPhone(m.phone),
    name: templateName(m.templateKey),
    text: isTemplateKey(m.templateKey)
      ? renderStoredPreview(m.templateKey, payloadToParams(m.payload))
      : "No hay vista previa para este tipo de mensaje.",
    status: m.status,
    attempts: m.attempts,
    scheduledFor: m.scheduledFor,
    sentAt: m.sentAt,
    lastError: m.lastError,
  }));

  const firstShown = (page - 1) * MESSAGES_PAGE_SIZE + 1;
  const lastShown = firstShown + rows.length - 1;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-semibold text-tinta-suave">
        {countLabel(total, "mensaje", "mensajes")}, del más reciente al más antiguo
        {totalPages > 1
          ? `. Estás viendo del ${formatCount(firstShown)} al ${formatCount(lastShown)}.`
          : "."}
      </p>

      {/* Arriba también, para no tener que bajar toda la lista para cambiar de página. */}
      <Pagination page={page} totalPages={totalPages} hrefFor={hrefFor} label="Páginas, arriba de la lista" />

      <TableShell
        mobile={
          <ul aria-label="Mensajes" className="flex flex-col gap-3">
            {rows.map((m) => (
              <li
                key={m.id}
                className="flex flex-col gap-3 rounded-tarjeta border border-borde bg-superficie p-4 shadow-1"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-tinta">{m.name}</p>
                    <p className="tabular text-sm text-tinta-suave">Para {m.phone}</p>
                  </div>
                  <MessageStatusBlock message={m} />
                </div>
                <MessageText text={m.text} />
                <dl>
                  <dt className="text-sm text-tinta-suave">Enviado</dt>
                  <dd className="text-[15px]">
                    <SendTime message={m} />
                  </dd>
                </dl>
              </li>
            ))}
          </ul>
        }
      >
        <table className="w-full min-w-[52rem] text-left">
          <caption className="sr-only">Mensajes a pasajeros</caption>
          <thead>
            <tr className="border-b border-borde">
              {MESSAGE_COLUMNS.map((column) => (
                <th key={column} scope="col" className={cx(PANEL_TH_CLASS, column === "Mensaje" && "w-1/2")}>
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.id} className="border-b border-borde align-top last:border-0">
                <td className={cx(PANEL_TD_CLASS, "tabular align-top whitespace-nowrap")}>{m.phone}</td>
                <td className={cx(PANEL_TD_CLASS, "align-top")}>
                  <p className="font-semibold text-tinta">{m.name}</p>
                  <MessageText text={m.text} />
                </td>
                <td className={cx(PANEL_TD_CLASS, "align-top")}>
                  <MessageStatusBlock message={m} />
                </td>
                <td className={cx(PANEL_TD_CLASS, "align-top")}>
                  <SendTime message={m} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableShell>

      <Pagination page={page} totalPages={totalPages} hrefFor={hrefFor} />
    </div>
  );
}

/** Silueta de la lista de mensajes: línea del total y la tabla con sus cabeceras reales. */
export function MessagesListSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <LineSkeleton className="w-72" />
      <TableSkeleton columns={MESSAGE_COLUMNS} rows={8} mobileStatus mobileDetails={1} />
    </div>
  );
}
