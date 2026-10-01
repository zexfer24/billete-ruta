import type { MessageStatus } from "@prisma/client";
import Link from "next/link";
import { IconMessage } from "@/components/icons";
import { EmptyState, StatusBadge, TableShell, panelButtonClass } from "@/components/panel-ui";
import { cx } from "@/components/ui-classes";
import { MESSAGE_STATUS_LABELS, messageStatusTone } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { formatCaracasDate, formatCaracasDateTime24, formatCaracasTime24 } from "@/lib/time";
import { isTemplateKey, renderStoredPreview } from "@/modules/messaging";
import { countLabel, formatCount, formatPhone } from "../_shared/format";
import {
  ADMIN_TD_CLASS,
  ADMIN_TH_CLASS,
  DISCLOSURE_SUMMARY_CLASS,
  DisclosureChevron,
  Pagination,
  TimeCell,
} from "../_shared/lists";
import { withQuery } from "../_shared/period";
import { LineSkeleton, TableSkeleton } from "../_shared/skeletons";
import { MESSAGES_PATH, payloadToParams, templateName } from "./messages";

/** Mensajes por página: 25, como las demás listas paginadas del panel. */
export const MESSAGES_PAGE_SIZE = 25;

/** Cabeceras de la tabla, compartidas con su silueta de carga. */
const MESSAGE_COLUMNS = ["Para", "Mensaje", "Estado", "Enviado"] as const;

/** Diferencia desde la que el envío se considera fuera de la hora programada (un reintento, por ejemplo). */
const SCHEDULE_GAP_MS = 60_000;

/** Códigos de reserva dentro del texto (`TR-1002-6PAX-7WQF`), que no deben partirse por el guion. */
const RESERVATION_CODE = /(TR-[0-9A-Z]+(?:-[0-9A-Z]+)*)/;

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

/**
 * Texto que recibe el pasajero, siempre entero. Las plantillas no pasan de
 * unos 260 caracteres (tres líneas en la tabla, unas seis en la tarjeta):
 * recortarlo a dos líneas y sumar un "Ver mensaje completo" de 44 px casi
 * nunca ahorraba altura y parecía un enlace roto cuando el texto ya cabía.
 * Los códigos de reserva van en una sola pieza para leerlos de un vistazo.
 */
function MessageText({ text }: { text: string }) {
  const parts = text.split(RESERVATION_CODE);
  return (
    <p className="text-sm leading-relaxed text-tinta-suave">
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <span key={index} className="tabular whitespace-nowrap">
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </p>
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

/** Si el envío salió en otro momento que el programado (un reintento, por ejemplo). */
function sentOffSchedule(message: MessageRow): boolean {
  return (
    message.sentAt !== null && Math.abs(message.sentAt.getTime() - message.scheduledFor.getTime()) >= SCHEDULE_GAP_MS
  );
}

/**
 * Cuándo salió el mensaje, en la tabla. La hora programada solo se agrega si
 * todavía no sale o si salió en otro momento (un reintento): casi siempre
 * coinciden y repetirla en cada fila era ruido. Va como `TimeCell` (la hora y
 * debajo la fecha), igual que en las demás tablas del terminal.
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
  return (
    <span className="flex flex-col">
      <TimeCell time={formatCaracasTime24(message.sentAt)} date={formatCaracasDate(message.sentAt)} />
      {sentOffSchedule(message) ? (
        <span className="tabular text-sm text-tinta-suave">Programado para el {scheduled}</span>
      ) : null}
    </span>
  );
}

/**
 * Cuándo salió el mensaje, en la tarjeta del teléfono: una línea secundaria
 * bajo el destinatario, sin etiqueta aparte, para que la tarjeta sea corta.
 */
function sendLine(message: MessageRow): string {
  const scheduled = formatCaracasDateTime24(message.scheduledFor);
  if (!message.sentAt) {
    return `${message.status === "FALLIDO" ? "No salió" : "Todavía no sale"}. Programado para el ${scheduled}`;
  }
  const sent = `Enviado el ${formatCaracasDateTime24(message.sentAt)}`;
  return sentOffSchedule(message) ? `${sent}. Programado para el ${scheduled}` : sent;
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
                {/* Como en `MobileCard`: el título envuelve su texto y el estado
                    queda siempre arriba a la derecha, sin bajar de línea. */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-base font-semibold text-tinta">{m.name}</p>
                    <p className="tabular text-sm text-tinta-suave">Para {m.phone}</p>
                    <p className="tabular text-sm text-tinta-suave">{sendLine(m)}</p>
                  </div>
                  <div className="max-w-[55%] shrink-0">
                    <MessageStatusBlock message={m} />
                  </div>
                </div>
                <MessageText text={m.text} />
              </li>
            ))}
          </ul>
        }
      >
        {/* Sin ancho mínimo: el texto del mensaje, la columna más larga, se
            reparte el espacio y la tabla cabe entera desde 768 px. */}
        <table className="w-full text-left">
          <caption className="sr-only">Mensajes a pasajeros</caption>
          <thead>
            <tr className="border-b border-borde">
              {MESSAGE_COLUMNS.map((column) => (
                <th key={column} scope="col" className={ADMIN_TH_CLASS}>
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.id} className="border-b border-borde align-top last:border-0">
                <td className={cx(ADMIN_TD_CLASS, "tabular align-top whitespace-nowrap")}>{m.phone}</td>
                <td className={cx(ADMIN_TD_CLASS, "align-top")}>
                  <p className="font-semibold text-tinta">{m.name}</p>
                  <MessageText text={m.text} />
                </td>
                <td className={cx(ADMIN_TD_CLASS, "align-top")}>
                  <MessageStatusBlock message={m} />
                </td>
                <td className={cx(ADMIN_TD_CLASS, "align-top")}>
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
      <TableSkeleton
        columns={MESSAGE_COLUMNS}
        rows={8}
        mobileStatus
        mobileDetails={0}
        mobileSubtitleLines={2}
        mobileTextLines={4}
      />
    </div>
  );
}
