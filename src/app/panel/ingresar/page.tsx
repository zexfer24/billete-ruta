import { redirect } from "next/navigation";
import { currentPanelUser } from "@/modules/auth";
import { PanelLoginForm } from "./login-form";

/**
 * Quien ya tiene sesión abierta no debe ver el formulario de acceso: se le lleva
 * directo a su panel. Antes esta pantalla se dibujaba dentro de la barra lateral
 * de la sesión anterior y parecía que la aplicación estaba rota.
 */
export default async function IngresarPanelPage() {
  const user = await currentPanelUser();
  if (user) {
    redirect(user.role === "ADMIN" ? "/panel/admin/tablero" : "/panel");
  }
  return <PanelLoginForm />;
}
