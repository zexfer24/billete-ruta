import type { AgencyDashboard, RecentTicketRow } from "@/modules/reports";
import type { AgencyDepartureRow } from "@/modules/catalog";
import { formatMoney } from "@/lib/decimal";
import { formatCaracas, formatCaracasDate, formatCaracasTime24, type DashboardPeriod } from "@/lib/time";
import { StatCard } from "@/components/panel-ui";
import { IconBus, IconCash, IconClock, IconTicket } from "@/components/icons";
import { countLabel, departuresDetail, porCobrarDetail } from "./text";
import { isOverdue } from "./attention";
import { FIGURE_LABELS } from "./section-texts";

/**
 * Las cuatro cifras del periodo (spec 1.3: nunca más de cuatro a la vez), cada
 * una con una frase que le da contexto y un enlace a su detalle. "Reservas por
 * cobrar" es en vivo; las otras tres dependen del periodo elegido.
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
  const { pendingTickets, departures, revenue } = resumen;

  const detallePorCobrar = porCobrarDetail(pendingTickets.total, pendingTickets.payOnSite);

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
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label={FIGURE_LABELS.porCobrar}
        value={pendingTickets.total}
        detail={detallePorCobrar}
        href="/panel/pasajeros?vista=por-cobrar"
        icon={<IconClock />}
      />
      <StatCard
        label={FIGURE_LABELS.salidas}
        value={departures.total}
        detail={detalleSalidas}
        href="/panel/salidas"
        icon={<IconBus />}
      />
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
      <StatCard
        label={FIGURE_LABELS.tickets}
        value={emitidos.total}
        detail={detalleTickets}
        href="/panel/pasajeros?vista=pagadas"
        icon={<IconTicket />}
      />
    </div>
  );
}
