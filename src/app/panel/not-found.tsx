import type { Metadata } from "next";
import Link from "next/link";
import { PanelPageHeader, panelButtonClass } from "@/components/panel-ui";
import { currentPanelUser, panelHomeFor } from "@/modules/auth";

export const metadata: Metadata = {
  title: "Página no encontrada",
};

/**
 * 404 dentro del panel (spec 6.6): se pinta dentro del marco del panel, con
 * el menú de siempre, para que el operador o el administrador no caiga en la
 * portada pública del pasajero. Lo dispara un `notFound()` de una pantalla de
 * detalle, por ejemplo una salida con un identificador manipulado.
 */
export default async function PanelNotFound() {
  const user = await currentPanelUser();
  const home = user ? panelHomeFor(user.role) : "/panel/ingresar";

  return (
    <div className="flex flex-col gap-6">
      <PanelPageHeader
        title="No encontramos esta página"
        description="Puede que el enlace esté incompleto o que lo que buscas ya no exista. Desde el tablero puedes seguir con tu trabajo."
      />
      <div>
        <Link href={home} className={panelButtonClass("primario", "lg")}>
          {user ? "Volver al tablero" : "Ir al acceso del panel"}
        </Link>
      </div>
    </div>
  );
}
