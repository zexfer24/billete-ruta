import type { ReactNode } from "react";
import Link from "next/link";
import { currentPanelUser } from "@/modules/auth";

const OPERATOR_LINKS = [
  { href: "/panel", label: "Resumen" },
  { href: "/panel/pagos", label: "Pagos" },
  { href: "/panel/pasajeros", label: "Pasajeros" },
  { href: "/panel/salidas", label: "Salidas" },
  { href: "/panel/vehiculos", label: "Vehículos" },
  { href: "/panel/choferes", label: "Choferes" },
  { href: "/panel/movimientos", label: "Movimientos" },
  { href: "/panel/recaudacion", label: "Recaudación" },
];

export default async function PanelLayout({ children }: { children: ReactNode }) {
  const user = await currentPanelUser();

  // Sin sesión (por ejemplo en /panel/ingresar) se muestra solo el contenido.
  if (!user) {
    return <div className="min-h-screen bg-[var(--color-fondo)]">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-[var(--color-fondo)] lg:flex">
      <aside className="border-b border-[var(--color-borde)] bg-[var(--color-superficie)] px-6 py-6 lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r">
        <p className="text-sm font-medium uppercase tracking-wide text-[var(--color-texto-suave)]">
          {user.role === "ADMIN" ? "Administración del terminal" : (user.agencyName ?? "Agencia")}
        </p>
        <p className="mt-1 text-lg font-semibold">{user.name}</p>

        <nav className="mt-6 flex flex-col gap-1">
          {user.role === "ADMIN" ? (
            <Link
              href="/panel/admin/tablero"
              className="rounded-md px-3 py-2 text-sm font-medium hover:bg-[var(--color-acento-suave)]"
            >
              Panel de administración
            </Link>
          ) : (
            OPERATOR_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md px-3 py-2 text-sm font-medium hover:bg-[var(--color-acento-suave)]"
              >
                {link.label}
              </Link>
            ))
          )}
          <a
            href="/panel/salir"
            className="mt-4 rounded-md px-3 py-2 text-sm font-medium text-[var(--color-peligro)] hover:bg-[var(--color-acento-suave)]"
          >
            Salir
          </a>
        </nav>
      </aside>

      <main className="flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
