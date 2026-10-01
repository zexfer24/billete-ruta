import type { Metadata } from "next";
import { Suspense } from "react";
import { PanelPageHeader } from "@/components/panel-ui";
import { requirePanelUser } from "@/modules/auth";
import { departureTaxRevenue, last24h } from "@/modules/reports";
import { PeriodFilter } from "../_shared/period-filter";
import { periodParamsSchema, rangeKey, resolveAdminRange, spansSeveralDays } from "../_shared/period";
import { PERIOD_TITLE, PeriodData, PeriodDataSkeleton } from "./period-data";
import { LiveTax, LiveTaxSkeleton, RecurringCard, RecurringCardSkeleton } from "./top-cards";

export const metadata: Metadata = { title: "Tablero del terminal" };

/**
 * Inicio del administrador. Arriba, lo que no depende del periodo: la tasa de
 * salida cobrada en vivo (últimas 24 horas), destacada, y los usuarios
 * recurrentes. Debajo, el periodo elegido con sus cifras, los viajes
 * completados, los usuarios nuevos y el gráfico por hora.
 *
 * Ninguna consulta se espera antes de pintar la página: la de la tasa se
 * inicia aquí y se resuelve dentro de su propio `<Suspense>` sin clave, que
 * sigue montado al cambiar de periodo; solo el bloque del periodo, con clave,
 * vuelve a su silueta.
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
  const tax = departureTaxRevenue(window24h.from, window24h.to);

  return (
    <div className="flex flex-col gap-6">
      <PanelPageHeader
        title="Tablero del terminal"
        description="Lo que pasa en el terminal con todas las agencias: la tasa de salida cobrada, los viajes y los pasajeros nuevos."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Suspense fallback={<LiveTaxSkeleton />}>
            <LiveTax tax={tax} generatedAt={window24h.to} />
          </Suspense>
        </div>
        <Suspense fallback={<RecurringCardSkeleton />}>
          <RecurringCard />
        </Suspense>
      </div>

      {/* Como "Resumen de hoy" en el tablero de la agencia: un título de
          sección con las pestañas de periodo a su derecha y el rango debajo. */}
      <PeriodFilter path="/panel/admin/tablero" range={range} title={PERIOD_TITLE} />

      <Suspense
        key={rangeKey(range)}
        fallback={<PeriodDataSkeleton severalDays={range.period !== "24h" && spansSeveralDays(range)} />}
      >
        <PeriodData range={range} panelUserId={panelUser.id} />
      </Suspense>
    </div>
  );
}
