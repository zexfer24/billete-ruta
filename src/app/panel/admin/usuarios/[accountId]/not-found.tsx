import type { Metadata } from "next";
import Link from "next/link";
import { PanelPageHeader, panelButtonClass } from "@/components/panel-ui";

export const metadata: Metadata = { title: "Pasajero no encontrado" };

/**
 * 404 del perfil de un pasajero: el identificador no es válido o la cuenta no
 * existe. Se pinta dentro del marco del panel, como `panel/not-found.tsx`.
 */
export default function PassengerProfileNotFound() {
  return (
    <div className="flex flex-col gap-6">
      <PanelPageHeader
        title="No encontramos a este pasajero."
        description="Puede que el enlace esté incompleto o que la cuenta ya no exista. Vuelve a la lista para buscarlo otra vez."
      />
      <div>
        <Link href="/panel/admin/usuarios" className={panelButtonClass("primario", "lg")}>
          Volver a usuarios
        </Link>
      </div>
    </div>
  );
}
