import type { NextRequest } from "next/server";
import { can, currentPanelUser } from "@/modules/auth";
import { agencyMovements } from "@/modules/reports";
import { resolveAdminRange } from "../../_shared/period";
import { movementsCsv, parseMovementsParams } from "../movements";

/**
 * Descarga en CSV de los movimientos de las agencias, con el mismo periodo y
 * la misma agencia que la pantalla. Se genera solo cuando se pide, en lugar
 * de incrustarlo en la página. Requiere el permiso terminal.dashboard.
 */
export async function GET(request: NextRequest): Promise<Response> {
  const user = await currentPanelUser();
  if (!user) {
    return new Response("Tu sesión terminó. Vuelve a ingresar al panel.", {
      status: 401,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  if (!can(user.role, "terminal.dashboard")) {
    return new Response("No tienes permiso para descargar los movimientos.", {
      status: 403,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const search = request.nextUrl.searchParams;
  const params = parseMovementsParams({
    periodo: search.get("periodo") ?? undefined,
    from: search.get("from") ?? undefined,
    to: search.get("to") ?? undefined,
    agency: search.get("agency") ?? undefined,
  });
  const range = resolveAdminRange(params);
  const rows = await agencyMovements(range.from, range.to, params.agency);

  const fileName = `movimientos-${range.fromInput}-a-${range.toInput}.csv`;
  return new Response(movementsCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
