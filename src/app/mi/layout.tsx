import Link from "next/link";
import { requirePassenger } from "@/modules/auth";
import { maskIdNumber } from "@/lib/identity";

export default async function MiLayout({ children }: { children: React.ReactNode }) {
  const pasajero = await requirePassenger();

  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--color-borde)] bg-[var(--color-superficie)]">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="font-semibold">{pasajero.fullName}</p>
            <p className="tabular text-sm text-[var(--color-texto-suave)]">
              {maskIdNumber(pasajero.idNumber)}
            </p>
          </div>
          <nav className="flex flex-wrap items-center gap-4 text-sm font-medium">
            <Link href="/mi/reservar" className="hover:text-[var(--color-acento)]">
              Reservar
            </Link>
            <Link href="/mi/reservas" className="hover:text-[var(--color-acento)]">
              Mis reservas
            </Link>
            <Link href="/mi/documentos" className="hover:text-[var(--color-acento)]">
              Documentos
            </Link>
            <a href="/salir" className="text-[var(--color-peligro)]">
              Salir
            </a>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-8">{children}</main>
    </div>
  );
}
