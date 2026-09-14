"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  isActivePanelPath,
  OPERATOR_NAV,
  type PanelNavBadgeKey,
  type PanelNavIcon,
} from "@/lib/panel-nav";
import {
  IconBus,
  IconCalendar,
  IconChart,
  IconChevronDown,
  IconHome,
  IconLogout,
  IconStore,
  IconUsers,
  type IconProps,
} from "./icons";

const NAV_ICONS: Record<PanelNavIcon, ComponentType<IconProps>> = {
  tablero: IconHome,
  taquilla: IconStore,
  pasajeros: IconUsers,
  salidas: IconCalendar,
  flota: IconBus,
  reportes: IconChart,
};

/** Texto de cada insignia, en singular cuando el conteo es uno. */
const BADGE_LABELS: Record<PanelNavBadgeKey, (count: number) => string> = {
  pendingProofs: (count) => `${count} ${count === 1 ? "comprobante" : "comprobantes"} por revisar`,
};

export interface PanelNavProps {
  agencyName: string;
  userName: string;
  badges?: Partial<Record<PanelNavBadgeKey, number>>;
}

const LINK_CLASS =
  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-acento)]";

function NavBadge({ count, badgeKey }: { count: number; badgeKey: PanelNavBadgeKey }) {
  if (count <= 0) return null;
  return (
    <span
      aria-label={BADGE_LABELS[badgeKey](count)}
      className="tabular ml-auto inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-peligro)] px-1.5 text-xs font-semibold text-white"
    >
      <span aria-hidden="true">{count}</span>
    </span>
  );
}

/** Grupos del menú y el enlace de salida, compartidos entre la barra lateral y el menú móvil. */
function NavGroups({
  pathname,
  badges,
}: {
  pathname: string;
  badges: Partial<Record<PanelNavBadgeKey, number>>;
}) {
  return (
    <nav className="flex flex-col gap-5">
      {OPERATOR_NAV.map((group) => (
        <div key={group.label}>
          <p className="px-3 text-xs font-medium uppercase tracking-wide text-[var(--color-texto-suave)]">
            {group.label}
          </p>
          <div className="mt-1 flex flex-col gap-0.5">
            {group.links.map((link) => {
              const Icon = NAV_ICONS[link.icon];
              const active = isActivePanelPath(pathname, link.href);
              const count = link.badgeKey ? (badges[link.badgeKey] ?? 0) : 0;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`${LINK_CLASS} ${
                    active
                      ? "bg-[var(--color-acento-suave)] font-semibold text-[var(--color-acento)]"
                      : "text-[var(--color-texto)] hover:bg-[var(--color-acento-suave)]"
                  }`}
                >
                  <Icon width={20} height={20} aria-hidden="true" />
                  {link.label}
                  {link.badgeKey ? <NavBadge count={count} badgeKey={link.badgeKey} /> : null}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
      <a href="/panel/salir" className={`${LINK_CLASS} text-[var(--color-peligro)] hover:bg-[var(--color-acento-suave)]`}>
        <IconLogout width={20} height={20} aria-hidden="true" />
        Salir
      </a>
    </nav>
  );
}

/**
 * Menú agrupado del panel del operador: barra lateral fija desde `lg`, y un
 * menú desplegable (`<details>`) en pantallas angostas que se cierra al
 * navegar porque su `key` cambia con la ruta.
 */
export function PanelNav({ agencyName, userName, badges = {} }: PanelNavProps) {
  const pathname = usePathname();

  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 overflow-y-auto border-r border-[var(--color-borde)] bg-[var(--color-superficie)] px-4 py-6 lg:block">
        <div className="px-3">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-texto-suave)]">
            {agencyName}
          </p>
          <p className="mt-1 text-lg font-semibold">{userName}</p>
        </div>
        <div className="mt-6">
          <NavGroups pathname={pathname} badges={badges} />
        </div>
      </aside>

      <div className="border-b border-[var(--color-borde)] bg-[var(--color-superficie)] px-4 lg:hidden">
        <details key={pathname}>
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-acento)]">
            <span className="truncate">{agencyName}</span>
            <span className="flex items-center gap-1 text-[var(--color-texto-suave)]">
              Menú
              <IconChevronDown width={20} height={20} aria-hidden="true" />
            </span>
          </summary>
          <div className="pb-4">
            <NavGroups pathname={pathname} badges={badges} />
          </div>
        </details>
      </div>
    </>
  );
}
