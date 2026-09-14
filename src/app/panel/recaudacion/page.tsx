import { redirect } from "next/navigation";
import { legacyPanelRedirect } from "@/lib/panel-nav";

/** Ruta vieja: recaudación ahora vive como pestaña de `/panel/reportes`. */
export default async function RecaudacionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  redirect(legacyPanelRedirect("/panel/recaudacion", await searchParams));
}
