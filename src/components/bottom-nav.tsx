"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, ReactNode } from "react";
import { IconBell, IconBus, IconHome, IconTicket, type IconProps } from "./icons";

export interface BottomNavProps {
  /**
   * Contador de avisos. Un número pinta la insignia aquí mismo; un nodo (por
   * ejemplo un `<Suspense>` con `BottomNavBadge` dentro) se pinta tal cual,
   * para que el layout no espere la consulta de avisos antes de mostrarse.
   */
  noticeCount?: number | ReactNode;
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

const NOTICES_HREF = "/mi/avisos";

/** `/mi` solo se marca activo con igualdad exacta; el resto también con sus subrutas. */
function isActive(pathname: string, href: string): boolean {
  if (href === "/mi") return pathname === "/mi" || pathname === "/mi/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Insignia roja del contador de avisos. Va dentro del enlace "Avisos", después
 * de la etiqueta, para que el lector de pantalla diga "Avisos, 2 avisos por
 * atender". Con cero no pinta nada.
 */
export function BottomNavBadge({ count }: { count: number }) {
  if (!Number.isFinite(count) || count <= 0) return null;
  const visible = count > 9 ? "9+" : String(count);

  return (
    <>
      <span
        aria-hidden="true"
        className="tabular absolute left-1/2 top-1 ml-2.5 flex h-5 min-w-5 items-center justify-center rounded-pastilla bg-peligro px-1 text-xs font-bold text-white ring-2 ring-white"
      >
        {visible}
      </span>
      <span className="sr-only">
        , {count} {count === 1 ? "aviso por atender" : "avisos por atender"}
      </span>
    </>
  );
}

/**
 * Barra de navegación de cuatro destinos (spec 6.4): fija abajo en todos los
 * anchos. En el teléfono ocupa todo el ancho; desde `md` es una tarjeta
 * centrada con el mismo ancho máximo que la página (`max-w-2xl`), con las
 * esquinas superiores redondeadas, en vez de una franja de lado a lado.
 * El destino activo va en morado, con una pastilla detrás del icono y
 * `aria-current="page"`.
 */
export function BottomNav({ noticeCount = 0 }: BottomNavProps) {
  const pathname = usePathname();
  const badge =
    typeof noticeCount === "number" ? <BottomNavBadge count={noticeCount} /> : noticeCount;

  return (
    <nav
      aria-label="Principal"
      // Activa el relleno de desplazamiento de globals.css para que el foco
      // nunca quede tapado por esta barra fija (WCAG 2.2, 2.4.11).
      data-barra-inferior=""
      className="fixed inset-x-0 bottom-0 z-30 border-t border-borde bg-superficie pb-[env(safe-area-inset-bottom)] shadow-2 md:mx-auto md:w-full md:max-w-2xl md:rounded-t-tarjeta md:border-x md:px-2"
    >
      <div className="mx-auto flex w-full max-w-md md:max-w-none">
        {ITEMS.map(({ href, label, Icon }) => {
          const active = isActive(pathname, href);

          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={[
                "foco relative flex min-h-16 flex-1 flex-col items-center justify-center gap-1 rounded-control px-1 py-2 text-sm transition-colors duration-150 ease-out motion-reduce:transition-none",
                active
                  ? "font-bold text-marca-600"
                  : "font-medium text-tinta-suave hover:text-marca-700",
              ].join(" ")}
            >
              <span
                aria-hidden="true"
                className={[
                  "flex h-8 w-14 items-center justify-center rounded-pastilla transition-colors duration-150 ease-out motion-reduce:transition-none",
                  active ? "bg-marca-100" : "",
                ].join(" ")}
              >
                <Icon />
              </span>
              <span className="leading-tight">{label}</span>
              {href === NOTICES_HREF ? badge : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
