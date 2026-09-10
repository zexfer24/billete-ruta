import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PANEL_COOKIE, destroyPanelSession } from "@/modules/auth";

/** Cierra la sesión del panel y vuelve al acceso. */
export async function GET() {
  const store = await cookies();
  const token = store.get(PANEL_COOKIE)?.value;
  if (token) {
    await destroyPanelSession(token);
  }
  store.delete(PANEL_COOKIE);
  redirect("/panel/ingresar");
}
