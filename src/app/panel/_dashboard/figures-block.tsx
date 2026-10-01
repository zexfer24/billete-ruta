import Link from "next/link";
import type { AgencyDashboard, RecentTicketRow } from "@/modules/reports";
import type { AgencyDepartureRow } from "@/modules/catalog";
import { formatMoney } from "@/lib/decimal";
import { formatCaracas, formatCaracasDate, formatCaracasTime24, type DashboardPeriod } from "@/lib/time";
import { StatCard } from "@/components/panel-ui";
import { IconBus, IconCash, IconChevronRight, IconTicket } from "@/components/icons";
import { countLabel, departuresDetail, porCobrarNowText } from "./text";
import { isOverdue } from "./attention";
import { FIGURE_LABELS, TICKETS_SECTION_ID } from "./section-texts";
import { FIGURE_CELL_CLASS, FIGURE_WIDE_CELL_CLASS, FIGURES_GRID_CLASS } from "./figure-classes";

/**
 * Las tres cifras del periodo elegido (spec 1.3: nunca más de cuatro a la
 * vez), cada una con una frase que le da contexto. Todas dependen del periodo:
 * lo que va en vivo, como las reservas por cobrar, vive en "Lo que necesita
 * tu atención" (`PendingNowLine`), para que al cambiar de periodo no quede una
 * cifra quieta bajo "Resumen de…". Solo enlazan a su detalle cuando ese
 * detalle muestra la misma cifra: "Recaudado" abre Reportes con el mismo
 * periodo y "Salidas" abre la lista de salidas solo en "hoy" (esa lista no
 * filtra por 7 o 30 días). "Tickets" no abre "Pagadas", que cuenta todas las
 * fechas: baja a "Tickets nuevos" de este mismo tablero, que muestra los
 * últimos del mismo periodo. Así las tarjetas que se pueden tocar se ven
 * iguales y ninguna queda con un hueco abajo.
 */
export async function FiguresBlock({
  summary,
  tickets,
  todayDepartures,
  periodo,
  now,
}: {
  summary: Promise<AgencyDashboard>;
  tickets: Promise<{ rows: RecentTicketRow[]; total: number }>;
  /** Salidas del día, para contar las atrasadas en el periodo "hoy". */
  todayDepartures: Promise<AgencyDepartureRow[]>;
  periodo: DashboardPeriod;
  now: Date;
}) {
  const [resumen, emitidos, salidasHoy] = await Promise.all([summary, tickets, todayDepartures]);
  const { departures, revenue } = resumen;

  const detalleSalidas = departuresDetail(
    departures,
    periodo === "hoy" ? salidasHoy.filter((salida) => isOverdue(salida, now)).length : null,
  );

  const ultimo = emitidos.rows[0];
  const detalleTickets = ultimo
    ? `El último: ${
        formatCaracasDate(ultimo.issuedAt) === formatCaracasDate(now)
          ? `hoy a las ${formatCaracasTime24(ultimo.issuedAt)}`
          : formatCaracas(ultimo.issuedAt, "dd/MM 'a las' HH:mm")
      }`
    : "Todavía no se emite ninguno";

  return (
    <div className={FIGURES_GRID_CLASS}>
      <div className={FIGURE_WIDE_CELL_CLASS}>
        <StatCard
          label={FIGURE_LABELS.recaudado}
          value={formatMoney(revenue.totalUsd, "USD")}
          detail={
            revenue.payments > 0
              ? countLabel(revenue.payments, "pago recibido", "pagos recibidos")
              : "Todavía no hay pagos"
          }
          href={`/panel/reportes?vista=recaudacion&periodo=${periodo}`}
          icon={<IconCash />}
        />
      </div>
      <div className={FIGURE_CELL_CLASS}>
        <StatCard
          label={FIGURE_LABELS.salidas}
          value={departures.total}
          detail={detalleSalidas}
          href={periodo === "hoy" ? "/panel/salidas" : undefined}
          icon={<IconBus />}
        />
      </div>
      <div className={FIGURE_CELL_CLASS}>
        <StatCard
          label={FIGURE_LABELS.tickets}
          value={emitidos.total}
          detail={detalleTickets}
          href={`#${TICKETS_SECTION_ID}`}
          icon={<IconTicket />}
        />
      </div>
    </div>
  );
}

/**
 * Línea en vivo de "Lo que necesita tu atención": cuántas reservas deben
 * dinero ahora mismo, con su enlace a "Por cobrar". Es información, no un
 * aviso: una cifra que casi siempre es mayor que cero no debe competir con los
 * comprobantes por revisar ni con las salidas que embarcan pronto.
 */
export async function PendingNowLine({ summary }: { summary: Promise<AgencyDashboard> }) {
  const { pendingTickets } = await summary;
  return (
    <p className="flex flex-wrap items-center gap-x-2 text-[15px] text-tinta-suave">
      <span className="tabular">{porCobrarNowText(pendingTickets.total, pendingTickets.payOnSite)}</span>
      {pendingTickets.total > 0 ? (
        <Link
          href="/panel/pasajeros?vista=por-cobrar"
          className="foco inline-flex min-h-11 items-center gap-1 rounded-control px-2 font-semibold text-marca-700 hover:bg-marca-50"
        >
          Ver por cobrar
          <IconChevronRight className="size-5" />
        </Link>
      ) : null}
    </p>
  );
}
