import Link from "next/link";
import type { ReactNode } from "react";
import { requirePanelUser } from "@/modules/auth";

const NAV_ITEMS = [
  { href: "/panel/admin/tablero", label: "Tablero" },
  { href: "/panel/admin/movimientos", label: "Movimientos" },
  { href: "/panel/admin/usuarios", label: "Usuarios" },
  { href: "/panel/admin/agencias", label: "Agencias" },
  { href: "/panel/admin/tasas", label: "Tasas" },
  { href: "/panel/admin/mensajes", label: "Mensajes" },
] as const;

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requirePanelUser("terminal.dashboard");

  return (
    <div className="min-h-screen bg-[var(--color-fondo)]">
      <header className="border-b border-[var(--color-borde)] bg-[var(--color-superficie)]">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-texto-suave)]">
              Terminal de pasajeros · vista del administrador, no de una agencia
            </p>
            <h1 className="text-lg font-semibold tracking-tight">TicketRuta — Panel del terminal</h1>
          </div>
          <div className="text-right text-sm text-[var(--color-texto-suave)]">
            <p className="font-medium text-[var(--color-texto)]">{user.name}</p>
            <p>{user.email}</p>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-1 px-6 pb-3">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-[var(--color-texto-suave)] transition-colors hover:bg-[var(--color-acento-suave)] hover:text-[var(--color-acento)]"
            >
              {item.label}
            </Link>
          ))}
          <a
            href="/panel/salir"
            className="ml-auto rounded-md px-3 py-1.5 text-sm font-medium text-[var(--color-peligro)] hover:bg-red-50"
          >
            Salir
          </a>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
