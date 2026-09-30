import { Suspense, type ReactNode } from "react";
import { unstable_rethrow } from "next/navigation";
import { PanelFooter } from "@/components/panel-footer";
import { PanelNav, PanelNavBadge, PanelSkipLink } from "@/components/panel-nav";
import { ADMIN_NAV } from "@/lib/panel-nav";
import { currentPanelUser } from "@/modules/auth";
import { countPendingProofs } from "@/modules/payments";

/**
 * Insignia de comprobantes por revisar de "Pasajeros y pagos". Va dentro de su
 * propio `<Suspense>`: el menú y el skeleton de la página se pintan sin esperar
 * el conteo. Si el conteo falla, el menú queda sin insignia en vez de tumbar
 * la pantalla.
 */
async function PendingProofsBadge({ agencyId }: { agencyId: string }) {
  try {
    const count = await countPendingProofs(agencyId);
    return <PanelNavBadge count={count} badgeKey="pendingProofs" />;
  } catch (error) {
    unstable_rethrow(error);
    console.error("No se pudo contar los comprobantes por revisar", error);
    return null;
  }
}

export default async function PanelLayout({ children }: { children: ReactNode }) {
  const user = await currentPanelUser();

  // Sin sesión (por ejemplo en /panel/ingresar) se muestra solo el contenido.
  if (!user) {
    return <div className="min-h-dvh bg-lienzo">{children}</div>;
  }

  // El administrador del terminal lleva el marco del terminal: la misma
  // estructura que el panel de agencia (barra lateral con grupos) en la
  // variante `terminal` de morado profundo (spec 7.3). Se pinta aquí, y no en
  // /panel/admin/layout.tsx, porque `panel/loading.tsx` envuelve ese layout:
  // así su silueta aparece dentro del marco correcto mientras carga, en vez
  // de sin menú ni márgenes. El layout del admin queda solo como guarda.
  if (user.role === "ADMIN") {
    return (
      <PanelFrame
        nav={
          <PanelNav
            variant="terminal"
            groups={ADMIN_NAV}
            title="Terminal de pasajeros"
            userName={user.name}
          />
        }
      >
        {children}
      </PanelFrame>
    );
  }

  // Solo el operador tiene agencia asignada; el conteo alimenta la insignia
  // de "Pasajeros y pagos" del menú.
  const pendingProofs = user.agencyId ? (
    <Suspense fallback={null}>
      <PendingProofsBadge agencyId={user.agencyId} />
    </Suspense>
  ) : undefined;

  return (
    <PanelFrame
      nav={
        <PanelNav
          variant="agencia"
          title={user.agencyName ?? "Agencia"}
          userName={user.name}
          badges={pendingProofs ? { pendingProofs } : undefined}
        />
      }
    >
      {children}
    </PanelFrame>
  );
}

/** Marco común de los dos paneles: salto al contenido, menú, contenido y pie. */
function PanelFrame({ nav, children }: { nav: ReactNode; children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-lienzo lg:flex">
      <PanelSkipLink />
      {nav}
      <div className="flex min-w-0 flex-1 flex-col">
        <main id="contenido" className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
        <PanelFooter />
      </div>
    </div>
  );
}
