import { redirect } from "next/navigation";
import { legacyPanelRedirect } from "@/lib/panel-nav";

/** Ruta vieja: movimientos ahora vive como pestaña de `/panel/reportes`. */
export default async function MovimientosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  redirect(legacyPanelRedirect("/panel/movimientos", await searchParams));
}
