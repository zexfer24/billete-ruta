import type { ReactNode } from "react";
import { PanelFooter } from "@/components/panel-footer";
import { PanelNav, PanelSkipLink } from "@/components/panel-nav";
import { ADMIN_NAV } from "@/lib/panel-nav";
import { requirePanelUser } from "@/modules/auth";

/**
 * Cáscara del panel del terminal: la misma estructura que el panel de agencia
 * (barra lateral con grupos), en la variante `terminal` de morado profundo,
 * para que quien conoce una pantalla conozca la otra (spec 7.3).
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requirePanelUser("terminal.dashboard");

  return (
    <div className="min-h-dvh bg-lienzo lg:flex">
      <PanelSkipLink />
      <PanelNav
        variant="terminal"
        groups={ADMIN_NAV}
        title="Terminal de pasajeros"
        userName={user.name}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <main id="contenido" className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
        <PanelFooter />
      </div>
    </div>
  );
}
