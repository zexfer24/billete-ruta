import type { ReactNode } from "react";
import Link from "next/link";
import type { StatusTone } from "@/lib/labels";
import { IconArrowLeft, IconChevronRight } from "./icons";
import { Pill } from "./ui";
import { cx } from "./ui-classes";

/**
 * Piezas base del panel de agencia y del terminal (spec 2026-09-30, sección
 * 6): botones, campos, cabecera de página, tarjetas de cifra, pastillas de
 * estado, pestañas, estado vacío, barra de progreso, tablas y tarjetas de
 * sección. Solo utilidades de tokens; sin estado ni efectos. Las clases puras
 * viven en `ui-classes.ts`; `EmptyState` y `ProgressBar` se comparten con la
 * app del pasajero y se definen en `ui.tsx`.
 */

export {
  panelButtonClass,
  panelInputClass,
  PANEL_LABEL_CLASS,
  type PanelButtonSize,
  type PanelButtonVariant,
} from "./ui-classes";
export { EmptyState, ProgressBar } from "./ui";

/** Clases de una celda de cabecera de tabla del panel: oración normal, 14 px. */
export const PANEL_TH_CLASS = "px-4 py-3 text-left text-sm font-semibold text-tinta-suave";

/** Clases de una celda de datos de tabla del panel. */
export const PANEL_TD_CLASS = "px-4 py-3 align-middle text-sm text-tinta";

/**
 * Cabecera de página del panel: `h1` único, una frase que dice para qué sirve
 * la pantalla, acciones a la derecha y, en pantallas de detalle, un enlace
 * para volver.
 */
export function PanelPageHeader({
  title,
  description,
  actions,
  back,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  /** Enlace de regreso, por ejemplo `{ href: "/panel/salidas", label: "Volver a salidas" }`. */
  back?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-col gap-3">
      {back ? (
        <Link
          href={back.href}
          className="foco -ml-2 inline-flex min-h-11 w-fit items-center gap-1.5 rounded-control px-2 text-[15px] font-semibold text-marca-700 transition-colors duration-150 hover:bg-marca-50 motion-reduce:transition-none"
        >
          <IconArrowLeft className="size-5 shrink-0" />
          {back.label}
        </Link>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-3xl">
          <h1 className="text-2xl font-bold tracking-tight text-tinta sm:text-3xl">{title}</h1>
          {description ? (
            <p className="mt-1.5 text-base leading-relaxed text-tinta-suave">{description}</p>
          ) : null}
        </div>
        {/* En el teléfono la caja de acciones no pasa del ancho disponible y sus
            botones bajan de línea; desde `sm` conserva su ancho natural. */}
        {actions ? (
          <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2 sm:shrink-0">{actions}</div>
        ) : null}
      </div>
    </div>
  );
}

export type StatCardTone = "neutro" | "marca" | "exito" | "alerta" | "peligro";

const STAT_CARD_TONE_BAR: Record<StatCardTone, string> = {
  neutro: "bg-borde",
  marca: "bg-marca-600",
  exito: "bg-exito",
  alerta: "bg-alerta",
  peligro: "bg-peligro",
};

const STAT_CARD_CLASS =
  "relative flex flex-col overflow-hidden rounded-tarjeta border border-borde bg-superficie p-5 shadow-1";

/**
 * Tarjeta de cifra: etiqueta, cifra grande tabular y un detalle que le da
 * contexto. La barra superior de color refuerza el tono, pero nunca es la
 * única señal. Con `href` toda la tarjeta es un enlace y lo muestra con una
 * flecha.
 */
export function StatCard({
  label,
  value,
  detail,
  href,
  tone = "neutro",
  icon,
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  href?: string;
  tone?: StatCardTone;
  icon?: ReactNode;
}) {
  const contenido = (
    <>
      <span className={`absolute inset-x-0 top-0 h-1 ${STAT_CARD_TONE_BAR[tone]}`} aria-hidden="true" />
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-tinta-suave">{label}</p>
        {icon ? (
          <span
            aria-hidden="true"
            className="grid size-10 shrink-0 place-items-center rounded-full bg-marca-50 text-marca-600 [&>svg]:size-5"
          >
            {icon}
          </span>
        ) : null}
      </div>
      <p className="tabular mt-1 text-3xl font-bold tracking-tight text-tinta">{value}</p>
      {detail ? <p className="mt-1 text-sm leading-snug text-tinta-suave">{detail}</p> : null}
      {href ? (
        <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-marca-700">
          Ver detalle
          <IconChevronRight className="size-4" />
        </span>
      ) : null}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={`${STAT_CARD_CLASS} foco transition duration-150 ease-out hover:border-marca-600 hover:shadow-2 motion-reduce:transition-none`}
      >
        {contenido}
      </Link>
    );
  }

  return <div className={STAT_CARD_CLASS}>{contenido}</div>;
}

/**
 * Pastilla de estado del panel. Comparte implementación con `Pill` del
 * pasajero: texto de 14 px con punto del tono sobre su fondo suave.
 */
export function StatusBadge({ label, tone }: { label: string; tone: StatusTone }) {
  return <Pill tone={tone}>{label}</Pill>;
}

export interface PanelTab {
  href: string;
  label: string;
  count?: number;
  active: boolean;
}

/**
 * Pestañas segmentadas de 44 px. Son enlaces de navegación: la activa lleva
 * `aria-current="page"` y un contador opcional dice cuántos elementos hay en
 * cada una. Cuando no caben en una fila bajan a la siguiente en vez de
 * desplazarse de lado: así todas las opciones y la pestaña activa se ven
 * siempre, sin depender de adivinar que la tira se desliza. En el teléfono
 * cada fila se reparte el ancho para que el control se lea como un bloque.
 */
export function PanelTabs({ label, tabs }: { label: string; tabs: PanelTab[] }) {
  return (
    <nav aria-label={label}>
      <div className="flex w-full flex-wrap gap-1 rounded-tarjeta border border-borde bg-superficie p-1 shadow-1">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={tab.active ? "page" : undefined}
            className={cx(
              "foco inline-flex min-h-11 grow items-center justify-center gap-2 rounded-control px-4 text-[15px] font-semibold transition-colors duration-150 ease-out motion-reduce:transition-none sm:grow-0 sm:justify-start",
              tab.active
                ? "bg-marca-50 text-marca-800 ring-1 ring-inset ring-marca-200"
                : "text-tinta-suave hover:bg-lienzo hover:text-tinta",
            )}
          >
            {tab.label}
            {typeof tab.count === "number" ? (
              <span
                className={cx(
                  "tabular min-w-6 rounded-pastilla px-2 py-0.5 text-center text-xs font-bold",
                  tab.active ? "bg-marca-600 text-white" : "bg-lienzo text-tinta-suave",
                )}
              >
                {tab.count}
              </span>
            ) : null}
          </Link>
        ))}
      </div>
    </nav>
  );
}

/**
 * Envoltorio de tabla con desplazamiento horizontal para que nada desborde la
 * página. Con `mobile`, la tabla solo se ve desde `md` y por debajo se muestra
 * ese contenido (normalmente una lista de `MobileCard`).
 */
export function TableShell({ children, mobile }: { children: ReactNode; mobile?: ReactNode }) {
  const table = (
    <div className="overflow-x-auto rounded-tarjeta border border-borde bg-superficie shadow-1">{children}</div>
  );

  if (!mobile) return table;

  return (
    <>
      <div className="hidden md:block">{table}</div>
      <div className="md:hidden">{mobile}</div>
    </>
  );
}

/**
 * Tarjeta de una fila de tabla en pantallas angostas: título, estado, los 3 o
 * 4 datos esenciales y la acción. Se agrupan en una lista `ul` que arma la
 * página.
 */
export function MobileCard({
  title,
  subtitle,
  status,
  details,
  action,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  status?: ReactNode;
  details?: Array<{ label: string; value: ReactNode }>;
  action?: ReactNode;
}) {
  return (
    <li className="flex flex-col gap-3 rounded-tarjeta border border-borde bg-superficie p-4 shadow-1">
      {/* El estado va siempre arriba a la derecha: el título envuelve su propio
          texto en vez de empujar la pastilla a otra línea, así las tarjetas
          vecinas quedan alineadas sin importar el largo de la ruta. */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="break-words text-base font-semibold text-tinta">{title}</p>
          {subtitle ? <p className="text-sm text-tinta-suave">{subtitle}</p> : null}
        </div>
        {status ? <div className="max-w-[55%] shrink-0">{status}</div> : null}
      </div>
      {details && details.length > 0 ? (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
          {details.map((detail) => (
            <div key={detail.label} className="min-w-0">
              <dt className="text-sm text-tinta-suave">{detail.label}</dt>
              <dd className="tabular text-[15px] font-medium text-tinta">{detail.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {action ? <div className="flex flex-wrap gap-2">{action}</div> : null}
    </li>
  );
}

/** Tarjeta de sección con cabecera (título `h2`, descripción y acción) y cuerpo. */
export function SectionCard({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-tarjeta border border-borde bg-superficie shadow-1">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-borde px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-tinta">{title}</h2>
          {description ? <p className="mt-1 text-sm leading-snug text-tinta-suave">{description}</p> : null}
        </div>
        {action ? <div className="min-w-0 max-w-full sm:shrink-0">{action}</div> : null}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}
