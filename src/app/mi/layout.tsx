import { Suspense, type ReactNode } from "react";
import { unstable_rethrow } from "next/navigation";
import { requirePassenger } from "@/modules/auth";
import { listNoticesForAccount } from "@/modules/notices";
import { firstNamePart, maskIdNumber } from "@/lib/identity";
import { AppHeader, AppHeaderAction } from "@/components/app-header";
import { BottomNav, BottomNavBadge } from "@/components/bottom-nav";
import { IconDocument, IconExit } from "@/components/icons";

/**
 * Contador de avisos por atender (nivel alerta). Va dentro de su propio
 * `<Suspense>`: la cabecera, la barra y el skeleton de la página se pintan
 * sin esperar esta consulta. Si la consulta falla, la barra queda sin
 * contador en vez de tumbar la pantalla.
 */
async function NoticeBadge({ accountId }: { accountId: string }) {
  try {
    const avisos = await listNoticesForAccount(accountId);
    return <BottomNavBadge count={avisos.filter((aviso) => aviso.level === "alerta").length} />;
  } catch (error) {
    unstable_rethrow(error);
    console.error("No se pudo contar los avisos del pasajero", error);
    return null;
  }
}

export default async function MiLayout({ children }: { children: ReactNode }) {
  const pasajero = await requirePassenger();

  return (
    <div className="min-h-dvh bg-lienzo">
      <AppHeader
        titleAs="p"
        title={`Hola, ${firstNamePart(pasajero.fullName)}`}
        subtitle={`Cédula ${maskIdNumber(pasajero.idNumber)}`}
        right={
          <>
            <AppHeaderAction
              href="/mi/documentos"
              label="Documentos"
              icon={<IconDocument />}
            />
            <AppHeaderAction href="/salir" label="Salir" icon={<IconExit />} plain />
          </>
        }
      />
      <main
        id="contenido"
        className="mx-auto w-full max-w-md px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-5 md:max-w-2xl"
      >
        {children}
      </main>
      {/* Después de <main> en el orden del DOM: el teclado llega primero al contenido. */}
      <BottomNav
        noticeCount={
          <Suspense fallback={null}>
            <NoticeBadge accountId={pasajero.id} />
          </Suspense>
        }
      />
    </div>
  );
}
