"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import { IconBell, IconBus, IconHome, IconTicket, type IconProps } from "./icons";

export interface BottomNavProps {
  noticeCount?: number;
}

interface NavItem {
  href: string;
  label: string;
  Icon: ComponentType<IconProps>;
}

const ITEMS: NavItem[] = [
  { href: "/mi", label: "Inicio", Icon: IconHome },
  { href: "/mi/reservar", label: "Reservar", Icon: IconBus },
  { href: "/mi/reservas", label: "Mis viajes", Icon: IconTicket },
  { href: "/mi/avisos", label: "Avisos", Icon: IconBell },
];

/** `/mi` solo se marca activo con igualdad exacta; el resto también con sus subrutas. */
function isActive(pathname: string, href: string): boolean {
  if (href === "/mi") return pathname === "/mi";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Barra de navegación de cuatro destinos: fija abajo en móvil, fila de pestañas en `md`. */
export function BottomNav({ noticeCount = 0 }: BottomNavProps) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-30 flex border-t border-borde bg-white pb-[env(safe-area-inset-bottom)] md:static md:mx-auto md:my-3 md:max-w-2xl md:rounded-pastilla md:border"
    >
      {ITEMS.map(({ href, label, Icon }) => {
        const active = isActive(pathname, href);
        const mostrarContador = href === "/mi/avisos" && noticeCount > 0;

        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={[
              "relative flex min-h-16 flex-1 flex-col items-center justify-center gap-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marca",
              active ? "text-marca" : "text-tinta-suave",
            ].join(" ")}
          >
            {active ? (
              <span className="absolute inset-x-6 top-0 h-0.5 rounded-full bg-marca" aria-hidden="true" />
            ) : null}
            <span className="relative">
              <Icon aria-hidden="true" />
              {mostrarContador ? (
                <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-pastilla bg-cta px-1 text-[10px] font-bold text-white">
                  <span aria-hidden="true">{noticeCount}</span>
                  <span className="sr-only">{noticeCount} avisos</span>
                </span>
              ) : null}
            </span>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
