import Link from "next/link";
import type { RecentTicketRow } from "@/modules/reports";
import { formatCaracas, formatCaracasDate, formatCaracasTime24 } from "@/lib/time";
import { EmptyState, StatusBadge, panelButtonClass } from "@/components/panel-ui";
import { DashboardSection } from "./section-card";
import { IconTicket } from "@/components/icons";
import { ticketsSection } from "./section-texts";
import { TICKET_ROW_CLASS, TICKETS_LIST_CLASS, mobileRowClass } from "./list-classes";

/** Cuántos tickets muestra el tablero antes de remitir a "Pasajeros y pagos". */
const MAX_FILAS = 5;

/** Hora de emisión: solo la hora si fue hoy, o la fecha corta y la hora si no. */
function emitido(date: Date, now: Date): string {
  return formatCaracasDate(date) === formatCaracasDate(now)
    ? `Emitido hoy a las ${formatCaracasTime24(date)}`
    : `Emitido el ${formatCaracas(date, "dd/MM 'a las' HH:mm")}`;
}

/**
 * "Tickets nuevos" del tablero: los últimos tickets emitidos en el periodo.
 * El código de cada uno abre la reserva en "Pasajeros y pagos".
 */
export async function TicketsBlock({
  tickets,
  periodPhrase,
  now,
}: {
  tickets: Promise<{ rows: RecentTicketRow[]; total: number }>;
  /** El periodo en palabras, por ejemplo "hoy" o "los últimos 7 días". */
  periodPhrase: string;
  now: Date;
}) {
  const { rows } = await tickets;
  const visibles = rows.slice(0, MAX_FILAS);
  const textos = ticketsSection(periodPhrase);

  return (
    <DashboardSection
      title={textos.title}
      description={textos.description}
      action={
        <Link href="/panel/pasajeros?vista=pagadas" className={panelButtonClass("secundario")}>
          {textos.actionLabel}
        </Link>
      }
    >
      {visibles.length === 0 ? (
        <EmptyState
          icon={<IconTicket />}
          title="Todavía no hay tickets en este periodo"
          description="El ticket se emite cuando una reserva queda pagada por completo."
        />
      ) : (
        <ul className={TICKETS_LIST_CLASS}>
          {visibles.map((ticket, index) => (
            <li key={ticket.reservationId} className={`${TICKET_ROW_CLASS} ${mobileRowClass(index)}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link
                  href={`/panel/pasajeros?vista=pagadas&reserva=${ticket.reservationId}`}
                  className="foco tabular -mx-1 inline-flex min-h-11 items-center rounded-sm px-1 font-semibold text-marca-700 hover:underline"
                >
                  {ticket.code}
                </Link>
                {ticket.salesChannel === "TAQUILLA" ? <StatusBadge label="Taquilla" tone="neutro" /> : null}
              </div>
              <p className="text-sm text-tinta">
                {ticket.holderName} · {ticket.origin} → {ticket.destination}
              </p>
              <p className="tabular text-sm text-tinta-suave">{emitido(ticket.issuedAt, now)}</p>
            </li>
          ))}
        </ul>
      )}
    </DashboardSection>
  );
}
