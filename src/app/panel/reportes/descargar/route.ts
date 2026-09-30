import type { NextRequest } from "next/server";
import { requireAgencyUser } from "@/modules/auth";
import { driverMovements, revenueByRoute } from "@/modules/reports";
import { movementsCsv, reportFileName, revenueCsv } from "../csv";
import { reportViewFromSlug, resolveMovementsRange, resolveRevenueRange } from "../range";

export const dynamic = "force-dynamic";

/**
 * Descarga el reporte visible como CSV para Excel, con los mismos parámetros
 * de la página (`vista`, `periodo`, `desde`, `hasta`, `horaDesde`,
 * `horaHasta`). El archivo se arma al pedirlo, en vez de ir incrustado en la
 * página, y siempre con los datos de la agencia de la sesión.
 */
export async function GET(request: NextRequest): Promise<Response> {
  const { agencyId } = await requireAgencyUser("agency.reports");
  const search = request.nextUrl.searchParams;
  const param = (name: string) => search.get(name) ?? undefined;

  const vista = reportViewFromSlug(param("vista"));
  const periodo = param("periodo");
  const desde = param("desde");
  const hasta = param("hasta");

  let csv: string;
  let fileName: string;
  if (vista === "recaudacion") {
    const range = resolveRevenueRange({ periodo, desde, hasta, horaDesde: param("horaDesde"), horaHasta: param("horaHasta") });
    csv = revenueCsv(await revenueByRoute(agencyId, range.from, range.to));
    fileName = reportFileName(vista, range);
  } else {
    const range = resolveMovementsRange({ periodo, desde, hasta });
    csv = movementsCsv(await driverMovements(agencyId, range.from, range.to));
    fileName = reportFileName(vista, range);
  }

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
