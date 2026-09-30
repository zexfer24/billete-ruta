import type { Metadata } from "next";
import { Suspense } from "react";
import { PanelPageHeader } from "@/components/panel-ui";
import { formatMoney } from "@/lib/decimal";
import { requirePanelUser } from "@/modules/auth";
import { departureTaxRevenue, last24h } from "@/modules/reports";
import { PeriodFilter } from "../_shared/period-filter";
import { periodParamsSchema, rangeKey, resolveAdminRange } from "../_shared/period";
import { LiveTaxCard } from "./live-tax";
import { PeriodData, PeriodDataSkeleton } from "./period-data";

export const metadata: Metadata = { title: "Tablero del terminal" };

/**
 * Inicio del administrador: la tasa de salida cobrada en vivo (últimas 24
 * horas) arriba y destacada; debajo, el periodo elegido con sus cifras, los
 * recorridos completados, los usuarios nuevos y el gráfico por hora.
 */
export default async function TableroAdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const panelUser = await requirePanelUser("terminal.dashboard");
  const parsed = periodParamsSchema.safeParse(await searchParams);
  const range = resolveAdminRange(parsed.success ? parsed.data : {});

  const window24h = last24h();
  const tax = await departureTaxRevenue(window24h.from, window24h.to);

  return (
    <div className="flex flex-col gap-6">
      <PanelPageHeader
        title="Tablero del terminal"
        description="Lo que pasa en el terminal con todas las agencias: la tasa de salida cobrada, los viajes y los pasajeros nuevos."
      />

      <LiveTaxCard
        initial={{
          totalUsd: formatMoney(tax.totalUsd, "USD"),
          reservations: tax.reservations,
          passengers: tax.passengers,
          generatedAt: window24h.to.toISOString(),
        }}
      />

      <PeriodFilter
        path="/panel/admin/tablero"
        range={range}
        caption="Recorridos, usuarios nuevos y gráfico"
      />

      <Suspense key={rangeKey(range)} fallback={<PeriodDataSkeleton />}>
        <PeriodData range={range} panelUserId={panelUser.id} />
      </Suspense>
    </div>
  );
}
