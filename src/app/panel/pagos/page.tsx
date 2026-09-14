import { redirect } from "next/navigation";
import { legacyPanelRedirect } from "@/lib/panel-nav";

/**
 * Pagos se unió a Pasajeros en `/panel/pasajeros`. Esta ruta solo traduce
 * enlaces y marcadores viejos hacia la vista "Por revisar" de la página nueva.
 */
export default async function PagosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  redirect(legacyPanelRedirect("/panel/pagos", await searchParams));
}
