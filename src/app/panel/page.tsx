import { requireAgencyUser } from "@/modules/auth";
import { agencyDashboard } from "@/modules/reports";
import { formatMoney } from "@/lib/decimal";

export default async function PanelResumenPage() {
  const { user, agencyId } = await requireAgencyUser("agency.reports");
  const resumen = await agencyDashboard(agencyId);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        Resumen de {user.agencyName ?? "la agencia"}
      </h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card label="Comprobantes pendientes" value={String(resumen.pendientes)} />
        <Card label="Salidas próximas (48 h)" value={String(resumen.proximas)} />
        <Card label="Recaudación (últimas 24 h)" value={formatMoney(resumen.recaudacionUsd, "USD")} />
        <Card label="Mensajes fallidos" value={String(resumen.fallidos)} />
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
