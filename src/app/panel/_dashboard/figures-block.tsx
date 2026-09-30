import type { AgencyDashboard, RecentTicketRow } from "@/modules/reports";
import { formatMoney } from "@/lib/decimal";
import { formatCaracas, formatCaracasDate, formatCaracasTime24, type DashboardPeriod } from "@/lib/time";
import { StatCard } from "@/components/panel-ui";
import { IconBus, IconCash, IconClock, IconTicket } from "@/components/icons";
import { countLabel, joinPhrases } from "./text";

/**
 * Las cuatro cifras del periodo (spec 1.3: nunca más de cuatro a la vez), cada
 * una con una frase que le da contexto y un enlace a su detalle. "Por cobrar
 * ahora" es en vivo; las otras tres dependen del periodo elegido.
 */
export async function FiguresBlock({
  summary,
  tickets,
  periodo,
  now,
}: {
  summary: Promise<AgencyDashboard>;
  tickets: Promise<{ rows: RecentTicketRow[]; total: number }>;
  periodo: DashboardPeriod;
  now: Date;
}) {
  const [resumen, emitidos] = await Promise.all([summary, tickets]);
  const { pendingTickets, departures, revenue } = resumen;

  const detallePorCobrar =
    joinPhrases([
      pendingTickets.proofsToReview > 0 &&
        countLabel(pendingTickets.proofsToReview, "comprobante por revisar", "comprobantes por revisar"),
      pendingTickets.payOnSite > 0 &&
        countLabel(pendingTickets.payOnSite, "paga en la taquilla", "pagan en la taquilla"),
    ]) || (pendingTickets.total > 0 ? "Esperan el pago del pasajero" : "Ninguna reserva debe dinero");

  const detalleSalidas =
    joinPhrases([
      departures.programadas > 0 && countLabel(departures.programadas, "programada", "programadas"),
      departures.embarcando > 0 && `${departures.embarcando} embarcando`,
      departures.enRuta > 0 && `${departures.enRuta} en ruta`,
      departures.finalizadas > 0 && countLabel(departures.finalizadas, "finalizada", "finalizadas"),
    ]) || "No hay salidas en este periodo";

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
        label="Por cobrar ahora"
        value={pendingTickets.total}
        detail={detallePorCobrar}
        href="/panel/pasajeros?vista=por-cobrar"
        icon={<IconClock />}
      />
      <StatCard
        label="Salidas"
        value={departures.total}
        detail={detalleSalidas}
        href="/panel/salidas"
        icon={<IconBus />}
      />
      <StatCard
        label="Recaudado"
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
        label="Tickets emitidos"
        value={emitidos.total}
        detail={detalleTickets}
        href="/panel/pasajeros?vista=pagadas"
        icon={<IconTicket />}
      />
    </div>
  );
}
