import { z } from "zod";
import type { MessageStatus } from "@prisma/client";
import { requirePanelUser } from "@/modules/auth";
import { prisma } from "@/lib/prisma";
import { formatCaracasDateTime24 } from "@/lib/time";
import { isTemplateKey, renderPreview } from "@/modules/messaging";

const STATUSES: readonly MessageStatus[] = ["ENCOLADO", "ENVIADO", "ENTREGADO", "LEIDO", "FALLIDO"];

const STATUS_LABELS: Record<MessageStatus, string> = {
  ENCOLADO: "Encolado",
  ENVIADO: "Enviado",
  ENTREGADO: "Entregado",
  LEIDO: "Leído",
  FALLIDO: "Fallido",
};

const searchParamsSchema = z.object({ status: z.string().optional() });
const payloadSchema = z.record(z.string());

/** Reconstruye el texto real que recibiría el pasajero a partir de la plantilla y su payload. */
function previewFor(templateKey: string, payload: unknown): string {
  if (!isTemplateKey(templateKey)) return "(plantilla desconocida)";
  const parsedPayload = payloadSchema.safeParse(payload);
  if (!parsedPayload.success) return "(datos incompletos para la vista previa)";
  try {
    return renderPreview(templateKey, parsedPayload.data);
  } catch (error) {
    return `(no se pudo generar la vista previa: ${error instanceof Error ? error.message : "error desconocido"})`;
  }
}

export default async function MensajesAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requirePanelUser("terminal.messages");
  const rawParams = searchParamsSchema.parse(await searchParams);
  const status =
    rawParams.status && (STATUSES as readonly string[]).includes(rawParams.status)
      ? (rawParams.status as MessageStatus)
      : undefined;

  const messages = await prisma.outboundMessage.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Bandeja de mensajes salientes</h2>
        <p className="mt-1 text-sm text-[var(--color-texto-suave)]">
          Mensajes que el sistema genera para los pasajeros a partir de sus plantillas.
        </p>
      </div>

      <div className="rounded-xl border border-[var(--color-borde)] bg-[var(--color-acento-suave)] px-4 py-3 text-sm text-[var(--color-acento)]">
        En esta versión los mensajes no salen a WhatsApp: se registran aquí con un proveedor simulado. Esta
        bandeja es donde se verifica que el contenido y el estado de cada envío sean correctos.
      </div>

      <form
        method="get"
        className="flex flex-wrap items-end gap-3 rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)] p-4"
      >
        <div>
          <label htmlFor="status" className="block text-xs font-medium text-[var(--color-texto-suave)]">
            Estado
          </label>
          <select
            id="status"
            name="status"
            defaultValue={status ?? ""}
            className="mt-1 rounded-md border border-[var(--color-borde)] px-3 py-1.5 text-sm"
          >
            <option value="">Todos</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="rounded-md bg-[var(--color-acento)] px-4 py-1.5 text-sm font-medium text-white"
        >
          Filtrar
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)]">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-[var(--color-borde)] text-xs uppercase tracking-wide text-[var(--color-texto-suave)]">
            <tr>
              <th className="px-4 py-3">Destinatario</th>
              <th className="px-4 py-3">Plantilla</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Intentos</th>
              <th className="px-4 py-3">Programado para</th>
              <th className="px-4 py-3">Enviado el</th>
              <th className="px-4 py-3">Último error</th>
            </tr>
          </thead>
          <tbody>
            {messages.map((m) => (
              <tr key={m.id} className="border-b border-[var(--color-borde)] align-top last:border-0">
                <td className="px-4 py-2 tabular">{m.phone}</td>
                <td className="px-4 py-2">
                  <details>
                    <summary className="cursor-pointer font-medium text-[var(--color-acento)]">
                      {m.templateKey}
                    </summary>
                    <p className="mt-2 max-w-sm text-[var(--color-texto-suave)]">
                      {previewFor(m.templateKey, m.payload)}
                    </p>
                  </details>
                </td>
                <td className="px-4 py-2">
                  <span className="rounded-full bg-[var(--color-acento-suave)] px-2 py-0.5 text-xs font-medium text-[var(--color-acento)]">
                    {STATUS_LABELS[m.status]}
                  </span>
                </td>
                <td className="px-4 py-2 text-right tabular">{m.attempts}</td>
                <td className="px-4 py-2 tabular">{formatCaracasDateTime24(m.scheduledFor)}</td>
                <td className="px-4 py-2 tabular">{m.sentAt ? formatCaracasDateTime24(m.sentAt) : "—"}</td>
                <td className="px-4 py-2 text-[var(--color-peligro)]">{m.lastError ?? "—"}</td>
              </tr>
            ))}
            {messages.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-[var(--color-texto-suave)]">
                  No hay mensajes con ese filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
