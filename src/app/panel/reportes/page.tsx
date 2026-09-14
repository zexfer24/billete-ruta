import type { ReactNode } from "react";
import { requireAgencyUser } from "@/modules/auth";
import { driverMovements, revenueByRoute } from "@/modules/reports";
import { PanelPageHeader, PanelTabs } from "@/components/panel-ui";
import { reportViewFromSlug, resolveMovementsRange, resolveRevenueRange } from "./range";
import { RevenueView } from "./revenue-view";
import { MovementsView } from "./movements-view";

interface ReportesSearchParams {
  vista?: string;
  periodo?: string;
  desde?: string;
  hasta?: string;
  horaDesde?: string;
  horaHasta?: string;
}

/**
 * Página unificada de reportes del panel: recaudación por ruta y movimientos
 * de choferes en pestañas. Solo resuelve la vista y el rango, carga los datos
 * y delega el detalle de cada vista a su propio componente de servidor.
 */
export default async function ReportesPage({
  searchParams,
}: {
  searchParams: Promise<ReportesSearchParams>;
}) {
  const { agencyId } = await requireAgencyUser("agency.reports");
  const params = await searchParams;
  const vista = reportViewFromSlug(params.vista);

  let contenido: ReactNode;
  if (vista === "recaudacion") {
    const range = resolveRevenueRange(params);
    const filas = await revenueByRoute(agencyId, range.from, range.to);
    contenido = <RevenueView range={range} filas={filas} />;
  } else {
    const range = resolveMovementsRange(params);
    const movimientos = await driverMovements(agencyId, range.from, range.to);
    contenido = <MovementsView range={range} movimientos={movimientos} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <PanelPageHeader
        title="Recaudación y movimientos"
        description="Horas en formato de 24 horas, hora de Caracas."
      />

      <PanelTabs
        label="Tipo de reporte"
        tabs={[
          {
            href: "/panel/reportes?vista=recaudacion",
            label: "Recaudación",
            active: vista === "recaudacion",
          },
          {
            href: "/panel/reportes?vista=movimientos",
            label: "Movimientos",
            active: vista === "movimientos",
          },
        ]}
      />

      {contenido}
    </div>
  );
}
