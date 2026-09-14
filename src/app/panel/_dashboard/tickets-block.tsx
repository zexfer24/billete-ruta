import Link from "next/link";
import type { RecentTicketRow } from "@/modules/reports";
import { formatCaracas, formatCaracasDate, formatCaracasTime24 } from "@/lib/time";
import { EmptyState, SectionCard, StatusBadge, panelButtonClass } from "@/components/panel-ui";

/**
 * Bloque "Tickets nuevos" del tablero: los tickets emitidos más recientes en
 * el periodo elegido, cada uno con su serial, titular, ruta y hora de
 * emisión.
 */
export function TicketsBlock({
  tickets,
  periodLabel,
  now,
}: {
  tickets: { rows: RecentTicketRow[]; total: number };
  periodLabel: string;
  now: Date;
}) {
  return (
    <SectionCard
      title="Tickets nuevos"
      description={`${tickets.total} emitido(s) · ${periodLabel}`}
      action={
        <Link href="/panel/pasajeros?vista=pagadas" className={panelButtonClass("secundario", "sm")}>
          Ver pagadas
        </Link>
      }
    >
      {tickets.rows.length === 0 ? (
        <EmptyState title="No se emitieron tickets en este periodo." />
      ) : (
        <ul className="flex flex-col divide-y divide-[var(--color-borde)]">
          {tickets.rows.map((ticket) => {
            const emitidoHoy = formatCaracasDate(ticket.issuedAt) === formatCaracasDate(now);
            return (
              <li key={ticket.reservationId} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link
                    href={`/panel/pasajeros?vista=pagadas&reserva=${ticket.reservationId}`}
                    className="tabular font-medium text-[var(--color-acento)] hover:underline"
                  >
                    {ticket.code}
                  </Link>
                  {ticket.salesChannel === "TAQUILLA" ? <StatusBadge label="Taquilla" tone="neutro" /> : null}
                </div>
                <p className="text-sm">{ticket.holderName}</p>
                <p className="text-sm text-[var(--color-texto-suave)]">
                  {ticket.routeName} · {formatCaracas(ticket.departsAt, "dd/MM HH:mm")}
                </p>
                <p className="text-xs text-[var(--color-texto-suave)]">
                  {emitidoHoy
                    ? `Emitido ${formatCaracasTime24(ticket.issuedAt)}`
                    : formatCaracas(ticket.issuedAt, "dd/MM HH:mm")}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}
