import Link from "next/link";
import { requirePassenger } from "@/modules/auth";
import { listNoticesForAccount } from "@/modules/notices";
import { firstNamePart, maskIdNumber } from "@/lib/identity";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { IconDocument, IconLogout } from "@/components/icons";

export default async function MiLayout({ children }: { children: React.ReactNode }) {
  const pasajero = await requirePassenger();
  const avisos = await listNoticesForAccount(pasajero.id);
  const noticeCount = avisos.filter((aviso) => aviso.level === "alerta").length;

  return (
    <div className="min-h-screen bg-lienzo">
      <AppHeader
        title={`Hola, ${firstNamePart(pasajero.fullName)}`}
        subtitle={maskIdNumber(pasajero.idNumber)}
        right={
          <>
            <Link
              href="/mi/documentos"
              aria-label="Mis documentos"
              className="flex h-11 w-11 items-center justify-center rounded-pastilla bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <IconDocument aria-hidden="true" />
            </Link>
            <a
              href="/salir"
              aria-label="Salir"
              className="flex h-11 w-11 items-center justify-center rounded-pastilla bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <IconLogout aria-hidden="true" />
            </a>
          </>
        }
      />
      <BottomNav noticeCount={noticeCount} />
      <main className="mx-auto w-full max-w-md px-4 pb-28 pt-4 md:max-w-2xl md:pb-12">{children}</main>
    </div>
  );
}
