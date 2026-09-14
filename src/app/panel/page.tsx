import { requireAgencyUser } from "@/modules/auth";
import { agencyDashboard } from "@/modules/reports";
import { formatMoney } from "@/lib/decimal";
import { caracasPeriodRange } from "@/lib/time";

export default async function PanelResumenPage() {
  const { user, agencyId } = await requireAgencyUser("agency.reports");
  const resumen = await agencyDashboard(agencyId, caracasPeriodRange("hoy"));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        Resumen de {user.agencyName ?? "la agencia"}
      </h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card label="Tickets pendientes" value={String(resumen.pendingTickets.total)} />
        <Card label="Salidas de hoy" value={String(resumen.departures.total)} />
        <Card label="Recaudación de hoy" value={formatMoney(resumen.revenue.totalUsd, "USD")} />
        <Card label="Mensajes fallidos" value={String(resumen.failedMessages)} />
      </div>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)] p-6">
      <p className="text-sm text-[var(--color-texto-suave)]">{label}</p>
      <p className="tabular mt-2 text-3xl font-semibold">{value}</p>
    </div>
  );
}
