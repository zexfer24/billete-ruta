/**
 * Menús agrupados y utilidades de navegación del panel: el del operador de
 * agencia (`OPERATOR_NAV`) y el del administrador del terminal (`ADMIN_NAV`).
 * Módulo puro (sin React ni Next) para poder probarlo con tests unitarios simples.
 */

export type PanelNavIcon =
  | "tablero"
  | "taquilla"
  | "pasajeros"
  | "salidas"
  | "flota"
  | "reportes"
  | "movimientos"
  | "usuarios"
  | "agencias"
  | "tasas"
  | "mensajes";
export type PanelNavBadgeKey = "pendingProofs";

export interface PanelNavLink {
  href: string;
  label: string;
  icon: PanelNavIcon;
  badgeKey?: PanelNavBadgeKey;
}

export interface PanelNavGroup {
  label: string;
  links: PanelNavLink[];
}

/** Menú agrupado del panel del operador, en el orden exacto en que se muestra. */
export const OPERATOR_NAV: readonly PanelNavGroup[] = [
  {
    label: "Operación",
    links: [
      { href: "/panel", label: "Tablero", icon: "tablero" },
      { href: "/panel/taquilla", label: "Taquilla", icon: "taquilla" },
      {
        href: "/panel/pasajeros",
        label: "Pasajeros y pagos",
        icon: "pasajeros",
        badgeKey: "pendingProofs",
      },
      { href: "/panel/salidas", label: "Salidas", icon: "salidas" },
    ],
  },
  {
    label: "Flota",
    links: [{ href: "/panel/flota", label: "Vehículos y choferes", icon: "flota" }],
  },
  {
    label: "Reportes",
    links: [{ href: "/panel/reportes", label: "Recaudación y movimientos", icon: "reportes" }],
  },
];

/**
 * Menú agrupado del panel del administrador del terminal, en el orden exacto
 * en que se muestra. Misma estructura que el del operador (spec 7.3), para que
 * quien conoce una pantalla conozca la otra.
 */
export const ADMIN_NAV: readonly PanelNavGroup[] = [
  {
    label: "Supervisión",
    links: [
      { href: "/panel/admin/tablero", label: "Tablero", icon: "tablero" },
      { href: "/panel/admin/movimientos", label: "Movimientos", icon: "movimientos" },
      { href: "/panel/admin/usuarios", label: "Usuarios", icon: "usuarios" },
    ],
  },
  {
    label: "Terminal",
    links: [
      { href: "/panel/admin/agencias", label: "Agencias", icon: "agencias" },
      { href: "/panel/admin/tasas", label: "Tasas del terminal", icon: "tasas" },
      { href: "/panel/admin/mensajes", label: "Mensajes", icon: "mensajes" },
    ],
  },
];

/**
 * Inicio de un menú: el primer enlace de su primer grupo. El logo de la barra
 * lateral enlaza aquí. Un menú vacío cae en `/panel`.
 */
export function panelNavHomeHref(groups: readonly PanelNavGroup[]): string {
  return groups[0]?.links[0]?.href ?? "/panel";
}

/**
 * Inicio del panel que corresponde a una ruta: el tablero del terminal bajo
 * `/panel/admin` y el de la agencia en el resto. Lo usan las pantallas de
 * error del panel, que son de cliente y no pueden leer la sesión.
 */
export function panelHomeForPath(pathname: string): string {
  const normalized = stripTrailingSlash(pathname);
  return matchesPath(normalized, "/panel/admin")
    ? panelNavHomeHref(ADMIN_NAV)
    : panelNavHomeHref(OPERATOR_NAV);
}

/**
 * Alias de ruta: el abordaje es parte del flujo de una salida, así que activa
 * el mismo enlace del menú aunque viva bajo otra ruta.
 */
const PATH_ALIASES: Partial<Record<string, string>> = {
  "/panel/salidas": "/panel/abordaje",
};

function stripTrailingSlash(pathname: string): string {
  if (pathname === "/") return pathname;
  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

function matchesPath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Si el `href` de un enlace del menú corresponde a la ruta actual, incluyendo alias. */
export function isActivePanelPath(pathname: string, href: string): boolean {
  const normalized = stripTrailingSlash(pathname);

  if (href === "/panel") return normalized === "/panel";
  if (matchesPath(normalized, href)) return true;

  const alias = PATH_ALIASES[href];
  return alias ? matchesPath(normalized, alias) : false;
}

/**
 * Origen permitido por el contrato de "registro rápido" (R5). Cualquier otro
 * valor, incluidas variantes de mayúsculas o espacios, se rechaza.
 */
export function parsePanelOrigin(value: unknown): "tablero" | null {
  return value === "tablero" ? "tablero" : null;
}

export type LegacyPanelPath =
  | "/panel/pagos"
  | "/panel/vehiculos"
  | "/panel/choferes"
  | "/panel/recaudacion"
  | "/panel/movimientos";

interface LegacyRedirectSpec {
  path: string;
  vista: string;
  params: readonly string[];
}

const LEGACY_REDIRECTS: Record<LegacyPanelPath, LegacyRedirectSpec> = {
  "/panel/pagos": {
    path: "/panel/pasajeros",
    vista: "por-revisar",
    params: ["comprobante", "pagina", "ok", "error"],
  },
  "/panel/vehiculos": {
    path: "/panel/flota",
    vista: "vehiculos",
    params: ["editar", "ok", "error"],
  },
  "/panel/choferes": {
    path: "/panel/flota",
    vista: "choferes",
    params: ["editar", "ok", "error"],
  },
  "/panel/recaudacion": {
    path: "/panel/reportes",
    vista: "recaudacion",
    params: ["desde", "hasta", "horaDesde", "horaHasta"],
  },
  "/panel/movimientos": {
    path: "/panel/reportes",
    vista: "movimientos",
    params: ["desde", "hasta"],
  },
};

/**
 * Traduce una ruta vieja del panel a su destino nuevo, conservando solo los
 * parámetros permitidos para esa ruta, en el orden de la tabla. Un arreglo
 * usa su primer valor; los valores vacíos o `undefined` se omiten y ningún
 * parámetro fuera de la lista permitida sobrevive.
 */
export function legacyPanelRedirect(
  path: LegacyPanelPath,
  searchParams: Record<string, string | string[] | undefined>,
): string {
  const spec = LEGACY_REDIRECTS[path];
  const query = new URLSearchParams();
  query.set("vista", spec.vista);

  for (const key of spec.params) {
    const raw = searchParams[key];
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (value === undefined || value === "") continue;
    query.set(key, value);
  }

  return `${spec.path}?${query.toString()}`;
}
