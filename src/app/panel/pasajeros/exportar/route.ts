import { requireAgencyUser } from "@/modules/auth";
import { listAgencyPassengers } from "@/modules/reports";
import { buildPassengersCsv, CSV_BOM, MAX_CSV_ROWS } from "../csv";
import { parsePasajerosFilters } from "../filters";

/**
 * Descarga de la lista de "Pasajeros y pagos" en CSV, con la misma vista y
 * los mismos filtros de la pantalla. Antes el archivo iba incrustado en la
 * página como `data:` URL de hasta 500 filas, que se volvía a generar en cada
 * visita aunque nadie lo descargara. El `agencyId` sale de la sesión, nunca
 * de la URL.
 */
export async function GET(request: Request): Promise<Response> {
  const { agencyId } = await requireAgencyUser("payments.review");
  const params = new URL(request.url).searchParams;
  const filtros = parsePasajerosFilters({
    vista: params.get("vista"),
    salida: params.get("salida"),
    buscar: params.get("buscar"),
  });
  const vista = filtros.vista ?? "todas";

  const { rows } = await listAgencyPassengers(agencyId, {
    view: vista,
    departureId: filtros.salida,
    search: filtros.buscar,
    page: 1,
    pageSize: MAX_CSV_ROWS,
  });

  return new Response(`${CSV_BOM}${buildPassengersCsv(rows)}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="pasajeros-${vista}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
