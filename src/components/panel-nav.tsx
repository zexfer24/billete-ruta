"use client";

import { useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  isActivePanelPath,
  OPERATOR_NAV,
  panelNavHomeHref,
  type PanelNavBadgeKey,
  type PanelNavGroup,
  type PanelNavIcon,
} from "@/lib/panel-nav";
import {
  IconBuilding,
  IconBus,
  IconCalendar,
  IconChart,
  IconClose,
  IconExit,
  IconHome,
  IconList,
  IconMenu,
  IconMessage,
  IconPercent,
  IconStore,
  IconUser,
  IconUsers,
  type IconProps,
} from "./icons";
import { Logo, LogoLockup } from "./logo";

const NAV_ICONS: Record<PanelNavIcon, ComponentType<IconProps>> = {
  tablero: IconHome,
  taquilla: IconStore,
  pasajeros: IconUsers,
  salidas: IconCalendar,
  flota: IconBus,
  reportes: IconChart,
  movimientos: IconList,
  usuarios: IconUsers,
  agencias: IconBuilding,
  tasas: IconPercent,
  mensajes: IconMessage,
};

/** Texto de cada insignia para lectores de pantalla, en singular cuando el conteo es uno. */
const BADGE_LABELS: Record<PanelNavBadgeKey, (count: number) => string> = {
  pendingProofs: (count) => `${count} ${count === 1 ? "comprobante" : "comprobantes"} por revisar`,
};

/**
 * Texto corto que acompaña al número cuando la insignia sale en el botón
 * "Menú" de la barra superior: ahí no está al lado de su enlace, y un número
 * suelto no dice qué cuenta.
 */
const BADGE_SHORT_LABELS: Record<PanelNavBadgeKey, string> = {
  pendingProofs: "por revisar",
};

/**
 * Clase del contenedor de las insignias en el botón "Menú". `PanelNavBadge`
 * la detecta con un selector de ancestro y muestra su texto corto, porque el
 * layout entrega la insignia ya armada (dentro de un `<Suspense>`).
 */
const TOP_BAR_BADGE_CLASS = "insignia-barra";

export type PanelNavVariant = "agencia" | "terminal";

/** Etiqueta de rol bajo el logo (spec 6.4). */
const ROLE_LABELS: Record<PanelNavVariant, string> = {
  agencia: "Panel de agencia",
  terminal: "Administración del terminal",
};

export interface PanelNavProps {
  /** `agencia` (banda marca-600, cuerpo blanco) o `terminal` (morado profundo). */
  variant?: PanelNavVariant;
  /** Grupos del menú. Por defecto, el del operador. */
  groups?: readonly PanelNavGroup[];
  /** Nombre de la agencia o "Terminal de pasajeros". */
  title?: string;
  /** @deprecated Usa `title`. Se conserva por compatibilidad. */
  agencyName?: string;
  userName: string;
  /**
   * Insignias por clave. Un número pinta `PanelNavBadge` aquí mismo; un nodo
   * (por ejemplo un `<Suspense>` con `PanelNavBadge` dentro) se pinta tal
   * cual, para que el layout no espere el conteo antes de mostrar el menú.
   */
  badges?: Partial<Record<PanelNavBadgeKey, number | ReactNode>>;
}

/**
 * Insignia de trabajo pendiente de un enlace del menú. Es ámbar (alerta), no
 * roja: indica tareas por hacer, no un error. El número se ve y el lector de
 * pantalla oye la frase completa. Con cero no pinta nada. Dentro del botón
 * "Menú" (contenedor `insignia-barra`) suma un texto corto visible
 * ("73 por revisar").
 */
export function PanelNavBadge({ count, badgeKey }: { count: number; badgeKey: PanelNavBadgeKey }) {
  if (!Number.isFinite(count) || count <= 0) return null;
  return (
    <span className="ml-auto inline-flex shrink-0">
      <span
        aria-hidden="true"
        className="tabular inline-flex h-6 min-w-6 items-center justify-center gap-1 rounded-pastilla bg-alerta px-1.5 text-xs font-bold text-white [.insignia-barra_&]:px-2.5 [.insignia-barra_&]:text-sm"
      >
        {count > 99 ? "99+" : count}
        <span className="hidden font-semibold [.insignia-barra_&]:inline">
          {BADGE_SHORT_LABELS[badgeKey]}
        </span>
      </span>
      <span className="sr-only">, {BADGE_LABELS[badgeKey](count)}</span>
    </span>
  );
}

/**
 * Enlace "Saltar al contenido": invisible hasta recibir el foco con el
 * teclado, para no recorrer todo el menú en cada página. Apunta a
 * `<main id="contenido">` del layout.
 */
export function PanelSkipLink() {
  return (
    <a
      href="#contenido"
      className="foco fixed left-4 top-4 z-50 -translate-y-24 rounded-control bg-superficie px-4 py-3 font-semibold text-marca-700 shadow-2 focus:translate-y-0"
    >
      Saltar al contenido
    </a>
  );
}

interface Theme {
  /** Banda superior con el logo. */
  band: string;
  /** Cuerpo de la barra lateral y del menú móvil. */
  body: string;
  groupTitle: string;
  link: string;
  /**
   * Enlace activo: fondo, color e indicador lateral (spec 6.4), sin cambiar el
   * peso de la letra. La negrita ensancha el texto y partía en dos líneas
   * "Recaudación y movimientos", con lo que el menú cambiaba de altura al
   * entrar a Reportes.
   */
  linkActive: string;
  indicator: string;
  focus: string;
  divider: string;
  muted: string;
}

const THEMES: Record<PanelNavVariant, Theme> = {
  agencia: {
    band: "bg-marca-600 text-white",
    body: "bg-superficie text-tinta",
    groupTitle: "text-tinta-suave",
    link: "text-tinta hover:bg-marca-50 hover:text-marca-700",
    linkActive: "bg-marca-50 text-marca-700",
    indicator: "bg-marca-600",
    focus: "foco",
    divider: "border-borde",
    muted: "text-tinta-suave",
  },
  terminal: {
    band: "bg-marca-900 text-white",
    body: "bg-marca-900 text-white",
    groupTitle: "text-marca-200",
    link: "text-white/85 hover:bg-white/10 hover:text-white",
    linkActive: "bg-white/10 text-white",
    indicator: "bg-sol",
    focus: "foco-sobre-marca",
    divider: "border-white/15",
    muted: "text-white/85",
  },
};

const LINK_BASE =
  "relative flex min-h-11 items-center gap-3 rounded-control px-3 py-2 text-[15px] leading-snug transition-colors duration-150 ease-out motion-reduce:transition-none";

function renderBadge(
  badgeKey: PanelNavBadgeKey,
  badges: Partial<Record<PanelNavBadgeKey, number | ReactNode>>,
): ReactNode {
  const value = badges[badgeKey];
  if (typeof value === "number") return <PanelNavBadge count={value} badgeKey={badgeKey} />;
  return value ?? null;
}

interface NavBodyProps {
  variant: PanelNavVariant;
  groups: readonly PanelNavGroup[];
  userName: string;
  pathname: string;
  badges: Partial<Record<PanelNavBadgeKey, number | ReactNode>>;
  onNavigate?: () => void;
}

/** Grupos del menú, usuario y "Salir": el mismo contenido en la barra lateral y en el menú móvil. */
function NavBody({ variant, groups, userName, pathname, badges, onNavigate }: NavBodyProps) {
  const theme = THEMES[variant];

  return (
    <>
      <nav aria-label="Menú del panel" className="flex flex-col gap-6 px-3 py-5">
        {groups.map((group) => (
          <div key={group.label}>
            <p className={`px-3 text-sm font-semibold ${theme.groupTitle}`}>{group.label}</p>
            <ul className="mt-2 flex flex-col gap-1">
              {group.links.map((link) => {
                const Icon = NAV_ICONS[link.icon];
                const active = isActivePanelPath(pathname, link.href);

                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      aria-current={active ? "page" : undefined}
                      onClick={onNavigate}
                      className={`${LINK_BASE} ${theme.focus} ${active ? theme.linkActive : theme.link}`}
                    >
                      {active ? (
                        <span
                          aria-hidden="true"
                          className={`absolute inset-y-2 left-0 w-1 rounded-pastilla ${theme.indicator}`}
                        />
                      ) : null}
                      <Icon width={20} height={20} aria-hidden="true" className="shrink-0" />
                      <span className="min-w-0 break-words">{link.label}</span>
                      {link.badgeKey ? renderBadge(link.badgeKey, badges) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className={`mt-auto border-t px-3 py-4 ${theme.divider}`}>
        <p className={`flex items-center gap-3 px-3 pb-2 text-sm ${theme.muted}`}>
          <IconUser width={20} height={20} aria-hidden="true" className="shrink-0" />
          <span className="min-w-0 break-words">
            <span className="sr-only">Sesión de </span>
            {userName}
          </span>
        </p>
        {/* Enlace normal: /panel/salir es una ruta del servidor y no debe precargarse. */}
        <a href="/panel/salir" className={`${LINK_BASE} ${theme.focus} ${theme.link}`}>
          <IconExit width={20} height={20} aria-hidden="true" className="shrink-0" />
          Salir
        </a>
      </div>
    </>
  );
}

/**
 * Menú agrupado del panel (spec 6.4), en dos variantes: `agencia` para el
 * operador y `terminal` para el administrador. Desde `lg` es una barra lateral
 * fija de 272 px con una banda morada arriba (logo blanco, rol y nombre). Por
 * debajo de `lg` es una barra superior fija con el logo horizontal y un botón
 * "Menú" que despliega el mismo contenido; se cierra al navegar, con Escape y
 * al tocar fuera.
 */
export function PanelNav({
  variant = "agencia",
  groups = OPERATOR_NAV,
  title,
  agencyName,
  userName,
  badges = {},
}: PanelNavProps) {
  const pathname = usePathname();
  const theme = THEMES[variant];
  const heading = title ?? agencyName ?? (variant === "terminal" ? "Terminal de pasajeros" : "Agencia");
  const homeHref = panelNavHomeHref(groups);
  const roleLabel = ROLE_LABELS[variant];

  // El menú móvil queda abierto solo en la ruta donde se abrió: al cambiar de
  // página se cierra solo, sin efectos que sincronicen estado.
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt === pathname;
  const buttonRef = useRef<HTMLButtonElement>(null);
  const close = () => setOpenAt(null);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpenAt(null);
      buttonRef.current?.focus();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  // En el botón "Menú" la insignia lleva texto visible ("73 por revisar"),
  // porque ahí no está junto a su enlace. En el teléfono no cabe al lado del
  // logo y no se muestra: sigue dentro del menú, junto a su enlace, y el
  // tablero ya avisa de los comprobantes por revisar.
  const pendingBadges = groups
    .flatMap((group) => group.links)
    .filter((link) => link.badgeKey)
    .map((link) => (
      <span key={link.href} className={`${TOP_BAR_BADGE_CLASS} hidden sm:inline-flex`}>
        {renderBadge(link.badgeKey as PanelNavBadgeKey, badges)}
      </span>
    ));

  return (
    <>
      <aside
        className={`sticky top-0 hidden h-dvh w-68 shrink-0 flex-col overflow-y-auto border-r lg:flex ${theme.body} ${
          variant === "agencia" ? "border-borde" : "border-marca-950"
        }`}
      >
        <div className={`px-6 pb-5 pt-6 ${theme.band}`}>
          <Link href={homeHref} className="foco-sobre-marca inline-block rounded-control">
            <Logo tone="blanco" priority className="h-18 w-auto" />
            <span className="sr-only">, ir al inicio</span>
          </Link>
          <p className="mt-4 text-sm font-medium text-white/85">{roleLabel}</p>
          <p className="mt-0.5 break-words text-lg font-bold leading-snug">{heading}</p>
        </div>
        <NavBody
          variant={variant}
          groups={groups}
          userName={userName}
          pathname={pathname}
          badges={badges}
        />
      </aside>

      {/* `data-barra-panel` activa el relleno de desplazamiento de globals.css
          para que el foco no quede bajo esta barra pegajosa (WCAG 2.2, 2.4.11). */}
      <div data-barra-panel="" className="sticky top-0 z-40 lg:hidden">
        <div
          className={`flex min-h-16 items-center justify-between gap-3 px-4 py-2 shadow-1 ${theme.band}`}
        >
          <Link href={homeHref} className="foco-sobre-marca min-w-0 rounded-control">
            <LogoLockup tone="blanco" label={heading} />
            <span className="sr-only">, ir al inicio</span>
          </Link>
          <button
            ref={buttonRef}
            type="button"
            aria-expanded={open}
            aria-controls="panel-menu-movil"
            onClick={() => setOpenAt(open ? null : pathname)}
            className="foco-sobre-marca flex min-h-11 shrink-0 items-center gap-2 rounded-control bg-white/10 px-4 font-semibold transition-colors duration-150 ease-out hover:bg-white/20 motion-reduce:transition-none"
          >
            {open ? (
              <IconClose width={22} height={22} aria-hidden="true" />
            ) : (
              <IconMenu width={22} height={22} aria-hidden="true" />
            )}
            {open ? "Cerrar" : "Menú"}
            {open ? null : pendingBadges}
          </button>
        </div>

        {open ? (
          <>
            <div
              aria-hidden="true"
              onClick={close}
              className="fixed inset-x-0 bottom-0 top-16 bg-tinta/40"
            />
            <div
              id="panel-menu-movil"
              className={`absolute inset-x-0 top-full flex max-h-[calc(100dvh-4rem)] flex-col overflow-y-auto shadow-2 ${theme.body}`}
            >
              <p className={`px-6 pt-5 text-sm font-medium ${theme.muted}`}>{roleLabel}</p>
              <NavBody
                variant={variant}
                groups={groups}
                userName={userName}
                pathname={pathname}
                badges={badges}
                onNavigate={close}
              />
            </div>
          </>
        ) : (
          <div id="panel-menu-movil" hidden />
        )}
      </div>
    </>
  );
}
