import type { ReactNode } from "react";
import { PanelNav } from "@/components/panel-nav";
import { currentPanelUser } from "@/modules/auth";
import { countPendingProofs } from "@/modules/payments";

export default async function PanelLayout({ children }: { children: ReactNode }) {
  const user = await currentPanelUser();

  // Sin sesión (por ejemplo en /panel/ingresar) se muestra solo el contenido.
  // El administrador del terminal tampoco lleva esta barra: su propio layout en
  // /panel/admin trae la navegación del terminal y superponer las dos dejaba la
  // pantalla con dos menús a la vez.
  if (!user || user.role === "ADMIN") {
    return <div className="min-h-screen bg-[var(--color-fondo)]">{children}</div>;
  }

  // Solo el operador tiene agencia asignada; el conteo alimenta la insignia
  // de "Pasajeros y pagos" del menú.
  const pendingProofs = user.agencyId ? await countPendingProofs(user.agencyId) : 0;

  return (
    <div className="min-h-screen bg-[var(--color-fondo)] lg:flex">
      <PanelNav
        agencyName={user.agencyName ?? "Agencia"}
        userName={user.name}
        badges={{ pendingProofs }}
      />
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
