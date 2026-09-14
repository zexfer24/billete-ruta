import type { ReactNode } from "react";
import Link from "next/link";
import type { StatusTone } from "@/lib/labels";

/**
 * Piezas base compartidas por las pantallas del panel del operador: botones,
 * cabecera de página, tarjetas de cifra, pastillas de estado, pestañas,
 * estado vacío, envoltorio de tabla y tarjeta de sección. Componentes de
 * servidor: nada aquí usa hooks ni eventos propios.
 */

export type PanelButtonVariant = "primario" | "secundario" | "exito" | "peligro" | "fantasma";
export type PanelButtonSize = "md" | "sm";

const PANEL_BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-acento)] disabled:cursor-not-allowed disabled:opacity-50";

const PANEL_BUTTON_SIZES: Record<PanelButtonSize, string> = {
  md: "min-h-10 px-4 text-sm",
  sm: "min-h-8 px-3 text-xs",
};

const PANEL_BUTTON_VARIANTS: Record<PanelButtonVariant, string> = {
  primario: "bg-[var(--color-acento)] text-white hover:brightness-90",
  secundario:
    "border border-[var(--color-borde)] bg-[var(--color-superficie)] hover:bg-[var(--color-acento-suave)]",
  exito: "bg-[var(--color-exito)] text-white hover:brightness-90",
  peligro: "bg-[var(--color-peligro)] text-white hover:brightness-90",
  fantasma: "text-[var(--color-acento)] hover:bg-[var(--color-acento-suave)]",
};

/** Clases de un botón del panel según variante y tamaño, listas para pegar en cualquier elemento clicable. */
export function panelButtonClass(
  variant: PanelButtonVariant,
  size: PanelButtonSize = "md",
  extra?: string,
): string {
  return [PANEL_BUTTON_BASE, PANEL_BUTTON_SIZES[size], PANEL_BUTTON_VARIANTS[variant], extra]
    .filter(Boolean)
    .join(" ");
}

const PANEL_INPUT_BASE =
  "w-full rounded-lg border border-[var(--color-borde)] bg-[var(--color-superficie)] px-3 py-2 text-sm text-[var(--color-texto)] transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-acento)] disabled:bg-[var(--color-fondo)] disabled:text-[var(--color-texto-suave)]";

/** Clases de un campo de formulario del panel, listas para pegar en cualquier `input`, `select` o `textarea`. */
export function panelInputClass(extra?: string): string {
  return extra ? `${PANEL_INPUT_BASE} ${extra}` : PANEL_INPUT_BASE;
}

/** Clases de la etiqueta de un campo de formulario del panel. */
export const PANEL_LABEL_CLASS = "flex flex-col gap-1 text-sm font-medium";

/** Cabecera de página del panel: título, descripción opcional y acciones a la derecha. */
export function PanelPageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? (
          <p className="mt-1 text-sm text-[var(--color-texto-suave)]">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export type StatCardTone = "neutro" | "exito" | "alerta" | "peligro";

const STAT_CARD_TONE_BAR: Record<StatCardTone, string> = {
  neutro: "bg-[var(--color-borde)]",
  exito: "bg-[var(--color-exito)]",
  alerta: "bg-[var(--color-alerta)]",
  peligro: "bg-[var(--color-peligro)]",
};

const STAT_CARD_CLASS =
  "relative overflow-hidden rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)] p-5";

/**
 * Tarjeta de cifra con una barra superior de color del tono. El tono nunca es
 * la única señal: la etiqueta y el detalle ya dicen qué es la cifra.
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
      <span
        className={`absolute inset-x-0 top-0 h-1 ${STAT_CARD_TONE_BAR[tone]}`}
        aria-hidden="true"
      />
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-[var(--color-texto-suave)]">{label}</p>
        {icon ? <span className="text-[var(--color-texto-suave)]">{icon}</span> : null}
      </div>
      <p className="tabular mt-1 text-3xl font-semibold">{value}</p>
      {detail ? <p className="mt-1 text-sm text-[var(--color-texto-suave)]">{detail}</p> : null}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={`${STAT_CARD_CLASS} block transition-colors duration-150 hover:border-[var(--color-acento)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-acento)] motion-reduce:transition-none`}
      >
        {contenido}
      </Link>
    );
  }

  return <div className={STAT_CARD_CLASS}>{contenido}</div>;
}

const STATUS_BADGE_CLASSES: Record<StatusTone, string> = {
  exito: "bg-[var(--color-exito-suave)] text-[var(--color-exito)]",
  alerta: "bg-[var(--color-alerta-suave)] text-[var(--color-alerta)]",
  peligro: "bg-[var(--color-peligro-suave)] text-[var(--color-peligro)]",
  marca: "bg-[var(--color-acento-suave)] text-[var(--color-acento)]",
  neutro: "border border-[var(--color-borde)] bg-[var(--color-fondo)] text-[var(--color-texto-suave)]",
};

/** Pastilla de estado con un punto del color del texto; el texto siempre se muestra. */
export function StatusBadge({ label, tone }: { label: string; tone: StatusTone }) {
  return (
    <span
      className={`inline-flex w-fit shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASSES[tone]}`}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" aria-hidden="true" />
      {label}
    </span>
  );
}

export interface PanelTab {
  href: string;
  label: string;
  count?: number;
  active: boolean;
}

/** Fila de pestañas segmentada y desplazable; la activa lleva `aria-current="page"`. */
export function PanelTabs({ label, tabs }: { label: string; tabs: PanelTab[] }) {
  return (
    <nav aria-label={label} className="overflow-x-auto">
      <div className="inline-flex min-w-full gap-1 rounded-lg border border-[var(--color-borde)] bg-[var(--color-superficie)] p-1">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={tab.active ? "page" : undefined}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-acento)] motion-reduce:transition-none ${
              tab.active
                ? "bg-[var(--color-acento-suave)] text-[var(--color-acento)]"
                : "text-[var(--color-texto-suave)] hover:bg-[var(--color-acento-suave)]"
            }`}
          >
            {tab.label}
            {typeof tab.count === "number" ? (
              <span className="tabular rounded-full bg-[var(--color-fondo)] px-1.5 py-0.5 text-xs">
                {tab.count}
              </span>
            ) : null}
          </Link>
        ))}
      </div>
    </nav>
  );
}

/** Estado vacío: caja con borde discontinuo, mensaje centrado y acción opcional debajo. */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-[var(--color-borde)] px-6 py-10 text-center">
      <p className="text-sm font-medium">{title}</p>
      {description ? <p className="text-sm text-[var(--color-texto-suave)]">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

/** Envoltorio con desplazamiento horizontal para que ninguna tabla desborde la página. */
export function TableShell({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)]">
      {children}
    </div>
  );
}

/** Tarjeta de sección con cabecera (título, descripción y acción) y cuerpo. */
export function SectionCard({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)]">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--color-borde)] px-5 py-4">
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          {description ? (
            <p className="mt-1 text-sm text-[var(--color-texto-suave)]">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}
