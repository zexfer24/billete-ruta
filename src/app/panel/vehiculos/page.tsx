import { redirect } from "next/navigation";
import { legacyPanelRedirect } from "@/lib/panel-nav";

/**
 * Ruta vieja: `/panel/vehiculos` ahora vive en `/panel/flota`. Sin guarda de
 * sesión propia, porque la página de destino ya la tiene.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  redirect(legacyPanelRedirect("/panel/vehiculos", await searchParams));
}
