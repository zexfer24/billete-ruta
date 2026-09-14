import type { ReactNode, SVGProps } from "react";

/**
 * Set de iconos SVG propios de trazo, sin dependencia externa. Componente de
 * servidor: ningún icono usa hooks ni eventos.
 */
export type IconProps = SVGProps<SVGSVGElement> & { title?: string };

/**
 * Helper interno que aplica el estilo común (24 px, trazo de 2 px, extremos
 * redondeados) y decide entre `aria-hidden` o `<title>` con `role="img"`
 * según si el icono recibe un texto accesible.
 */
function IconBase({
  title,
  children,
  ...props
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

/** Flecha de ubicación, como el triángulo de navegación de Transit. */
export function IconNavigation(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 2 19 21 12 17 5 21 Z" fill="currentColor" stroke="none" />
    </IconBase>
  );
}

/** Círculo relleno pequeño, usado como marcador de destino. */
export function IconDot(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="5" fill="currentColor" stroke="none" />
    </IconBase>
  );
}

/** Dos flechas verticales opuestas, para intercambiar origen y destino. */
export function IconSwap(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M8 20V6" />
      <path d="M5 9l3-3 3 3" />
      <path d="M16 4v14" />
      <path d="M13 15l3 3 3-3" />
    </IconBase>
  );
}

/** Deslizadores de ajustes o filtros. */
export function IconSliders(props: IconProps) {
  return (
    <IconBase {...props}>
      <line x1="4" y1="6" x2="20" y2="6" />
      <circle cx="9" cy="6" r="2" fill="currentColor" stroke="none" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <circle cx="15" cy="12" r="2" fill="currentColor" stroke="none" />
      <line x1="4" y1="18" x2="20" y2="18" />
      <circle cx="7" cy="18" r="2" fill="currentColor" stroke="none" />
    </IconBase>
  );
}

/** Dos flechas circulares, para refrescar. */
export function IconRefresh(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 12a8 8 0 0 1 14-5.3L21 9" />
      <path d="M21 4v5h-5" />
      <path d="M20 12a8 8 0 0 1-14 5.3L3 15" />
      <path d="M3 20v-5h5" />
    </IconBase>
  );
}

/** Tres arcos de señal, para indicar "en vivo". */
export function IconLive(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 18h.01" />
      <path d="M8.5 14.5a5 5 0 0 1 7 0" />
      <path d="M5.5 11.5a9 9 0 0 1 13 0" />
    </IconBase>
  );
}

/** Campana de notificaciones. */
export function IconBell(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
      <path d="M10 21a2 2 0 0 0 4 0" />
    </IconBase>
  );
}

/** Triángulo con exclamación, para alertas. */
export function IconWarning(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 3 2 20h20L12 3Z" />
      <line x1="12" y1="10" x2="12" y2="14" />
      <line x1="12" y1="17" x2="12" y2="17" />
    </IconBase>
  );
}

/** Ticket con muesca lateral. */
export function IconTicket(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4Z" />
      <line x1="14" y1="6" x2="14" y2="18" strokeDasharray="2 2" />
    </IconBase>
  );
}

/** Cuadrícula QR simplificada. */
export function IconQr(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </IconBase>
  );
}

/** Hoja de documento con líneas de texto. */
export function IconDocument(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M14 3v5h5" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="16" y2="17" />
    </IconBase>
  );
}

/** Casa, para el destino de inicio. */
export function IconHome(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 11 12 4l8 7" />
      <path d="M6 10v9a1 1 0 0 0 1 1h4v-6h2v6h4a1 1 0 0 0 1-1v-9" />
    </IconBase>
  );
}

/** Calendario. */
export function IconCalendar(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="8" y1="3" x2="8" y2="7" />
      <line x1="16" y1="3" x2="16" y2="7" />
    </IconBase>
  );
}

/** Dos personas, para pasajeros o acompañantes. */
export function IconUsers(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="9" cy="8" r="3" />
      <path d="M4 20v-1a5 5 0 0 1 5-5h0a5 5 0 0 1 5 5v1" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M15.5 14.2A4 4 0 0 1 20 18v2" />
    </IconBase>
  );
}

/** Aspa, para cerrar. */
export function IconClose(props: IconProps) {
  return (
    <IconBase {...props}>
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </IconBase>
  );
}

/** Chevron hacia la derecha, para navegar o expandir en línea. */
export function IconChevronRight(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M9 6l6 6-6 6" />
    </IconBase>
  );
}

/** Chevron hacia abajo, para desplegar. */
export function IconChevronDown(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M6 9l6 6 6-6" />
    </IconBase>
  );
}

/** Autobús visto de frente, único modo de transporte del terminal. */
export function IconBus(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="4" y="5" width="16" height="12" rx="2" />
      <line x1="4" y1="11" x2="20" y2="11" />
      <line x1="8" y1="5" x2="8" y2="11" />
      <line x1="16" y1="5" x2="16" y2="11" />
      <circle cx="8" cy="19" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="16" cy="19" r="1.5" fill="currentColor" stroke="none" />
    </IconBase>
  );
}

/** Salida de sesión. */
export function IconLogout(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3" />
      <path d="M15 16l4-4-4-4" />
      <line x1="19" y1="12" x2="9" y2="12" />
    </IconBase>
  );
}

/** Palomita de confirmación. */
export function IconCheck(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 12l5 5L20 6" />
    </IconBase>
  );
}

/** Reloj, para tiempos y horarios. */
export function IconClock(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </IconBase>
  );
}

/** Marcador de mapa, para origen o destino. */
export function IconMapPin(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 21s7-6.5 7-12a7 7 0 0 0-14 0c0 5.5 7 12 7 12Z" />
      <circle cx="12" cy="9" r="2.5" />
    </IconBase>
  );
}

/** Billete con el signo de una moneda, para pagos en efectivo. */
export function IconCash(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="3" />
      <line x1="6" y1="10" x2="6" y2="10" />
      <line x1="18" y1="14" x2="18" y2="14" />
    </IconBase>
  );
}

/** Tres barras verticales de altura creciente, para reportes. */
export function IconChart(props: IconProps) {
  return (
    <IconBase {...props}>
      <line x1="5" y1="20" x2="5" y2="13" />
      <line x1="12" y1="20" x2="12" y2="6" />
      <line x1="19" y1="20" x2="19" y2="16" />
    </IconBase>
  );
}

/** Lista de líneas con viñetas. */
export function IconList(props: IconProps) {
  return (
    <IconBase {...props}>
      <line x1="9" y1="6" x2="20" y2="6" />
      <line x1="9" y1="12" x2="20" y2="12" />
      <line x1="9" y1="18" x2="20" y2="18" />
      <line x1="4" y1="6" x2="4" y2="6" />
      <line x1="4" y1="12" x2="4" y2="12" />
      <line x1="4" y1="18" x2="4" y2="18" />
    </IconBase>
  );
}

/** Cruz simple, para añadir o crear. */
export function IconPlus(props: IconProps) {
  return (
    <IconBase {...props}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </IconBase>
  );
}

/** Mostrador con toldo, para la taquilla. */
export function IconStore(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 9 5 4h14l1 5" />
      <path d="M4 9v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9" />
      <line x1="4" y1="9" x2="20" y2="9" />
      <line x1="12" y1="13" x2="12" y2="20" />
    </IconBase>
  );
}
