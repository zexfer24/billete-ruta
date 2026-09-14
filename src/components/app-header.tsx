import Link from "next/link";
import type { ReactNode } from "react";
import { IconChevronRight } from "./icons";

export interface AppHeaderProps {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  back?: string;
  compact?: boolean;
}

/**
 * Cabecera azul de la app del pasajero: marca "TicketRuta" arriba, título
 * grande, botón de volver opcional y acciones a la derecha.
 */
export function AppHeader({ title, subtitle, right, back, compact }: AppHeaderProps) {
  return (
    <header
      className={[
        "rounded-b-[28px] bg-marca text-white",
        compact
          ? "px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-4"
          : "px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-6",
      ].join(" ")}
    >
      <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-white/80">
        <span className="h-1.5 w-1.5 rounded-full bg-cta" aria-hidden="true" />
        TicketRuta
      </p>
      <div className="mt-2 flex items-center gap-2">
        {back ? (
          <Link
            href={back}
            aria-label="Volver"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-pastilla focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <IconChevronRight className="rotate-180" />
          </Link>
        ) : null}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-extrabold">{title}</h1>
          {!compact && subtitle ? <p className="tabular text-sm text-white/80">{subtitle}</p> : null}
        </div>
        {right ? <div className="flex shrink-0 items-center gap-2">{right}</div> : null}
      </div>
    </header>
  );
}
