import type { Metadata } from "next";
import { Suspense } from "react";
import { requireAgencyUser } from "@/modules/auth";
import { driverMovements, revenueByRoute } from "@/modules/reports";
import { SkeletonScreen } from "@/components/skeleton";
import { PanelPageHeader, PanelTabs } from "@/components/panel-ui";
import { PeriodBar } from "./period-bar";
import { reportViewFromSlug, resolveMovementsRange, resolveRevenueRange, type ReportRange, type ReportView } from "./range";
import { ReportDataSkeleton } from "./report-skeleton";
import { RevenueView } from "./revenue-view";
import { MovementsView } from "./movements-view";

export const metadata: Metadata = { title: "Recaudación y movimientos" };

/** Parámetros de rango que entiende la página (y la descarga en CSV). */
const RANGE_PARAMS = ["periodo", "desde", "hasta", "horaDesde", "horaHasta"] as const;

type RangeParams = Partial<Record<(typeof RANGE_PARAMS)[number], string>>;

/** Un parámetro de búsqueda como texto; un valor repetido (`?a=1&a=2`) se ignora. */
function texto(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" && value !== "" ? value : undefined;
}

/** Enlace de descarga con la misma vista y el mismo rango que se está viendo. */
function downloadHref(vista: ReportView, params: RangeParams): string {
  const query = new URLSearchParams({ vista });
  for (const name of RANGE_PARAMS) {
    const value = params[name];
    if (value) query.set(name, value);
  }
  return `/panel/reportes/descargar?${query.toString()}`;
}

/** Datos del reporte activo, consultados dentro de su `<Suspense>`. */
async function ReportData({
  agencyId,
  vista,
  range,
  params,
}: {
  agencyId: string;
  vista: ReportView;
  range: ReportRange;
  params: RangeParams;
}) {
  if (vista === "recaudacion") {
    const filas = await revenueByRoute(agencyId, range.from, range.to);
    return <RevenueView range={range} filas={filas} downloadHref={downloadHref(vista, params)} />;
  }
  const movimientos = await driverMovements(agencyId, range.from, range.to);
  return <MovementsView range={range} movimientos={movimientos} downloadHref={downloadHref(vista, params)} />;
}

/**
 * Reportes de la agencia en dos pestañas: recaudación por ruta y movimientos
 * (viajes) de los choferes, con la misma palabra del menú y del título. La cabecera, las pestañas y el periodo salen al instante; los
 * datos cargan dentro de un `<Suspense>` que cambia con el periodo elegido.
 */
export default async function ReportesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { agencyId } = await requireAgencyUser("agency.reports");
  const raw = await searchParams;
  const vista = reportViewFromSlug(texto(raw.vista));
  const params: RangeParams = {};
  for (const name of RANGE_PARAMS) params[name] = texto(raw[name]);

  const range = vista === "recaudacion" ? resolveRevenueRange(params) : resolveMovementsRange(params);
  const dataKey = [vista, ...RANGE_PARAMS.map((name) => params[name] ?? "")].join("|");

  return (
    <div className="flex flex-col gap-6">
      <PanelPageHeader
        title="Recaudación y movimientos"
        description="Cuánto cobró tu agencia en cada ruta y qué viajes hicieron tus choferes."
      />

      <PanelTabs
        label="Tipo de reporte"
        tabs={[
          { href: "/panel/reportes?vista=recaudacion", label: "Recaudación", active: vista === "recaudacion" },
          { href: "/panel/reportes?vista=movimientos", label: "Movimientos de choferes", active: vista === "movimientos" },
        ]}
      />

      {/* Claves distintas para dos hermanos: las dos cambian con el rango para
          reiniciar el formulario del periodo y volver a mostrar el esqueleto. */}
      <PeriodBar key={`periodo|${dataKey}`} vista={vista} range={range} />

      <Suspense
        key={`datos|${dataKey}`}
        fallback={
          <SkeletonScreen label="Cargando el reporte…">
            <ReportDataSkeleton vista={vista} />
          </SkeletonScreen>
        }
      >
        <ReportData agencyId={agencyId} vista={vista} range={range} params={params} />
      </Suspense>
    </div>
  );
}
