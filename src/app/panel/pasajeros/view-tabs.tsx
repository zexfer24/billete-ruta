"use client";

import Link, { useLinkStatus } from "next/link";
import { cx } from "@/components/ui-classes";
import { IconSpinner } from "@/components/icons";
import type { PanelTab } from "@/components/panel-ui";

/**
 * Contador de la pestaña, o un indicador de espera mientras se abre. Tiene
 * que vivir dentro del `Link` para leer su estado con `useLinkStatus`.
 */
function TabCount({ count, active }: { count?: number; active: boolean }) {
  const { pending } = useLinkStatus();
  if (pending) {
    return (
      <span className="inline-flex min-w-6 items-center justify-center" role="status">
        <IconSpinner className="size-4 animate-spin motion-reduce:animate-none" />
        <span className="sr-only">Abriendo…</span>
      </span>
    );
  }
  if (typeof count !== "number") return null;
  return (
    <span
      className={cx(
        "tabular min-w-6 rounded-pastilla px-2 py-0.5 text-center text-xs font-bold",
        active ? "bg-marca-600 text-white" : "bg-lienzo text-tinta-suave",
      )}
    >
      {count}
    </span>
  );
}

/**
 * Pestañas de "Pasajeros y pagos": las mismas medidas y estilos que
 * `PanelTabs`, pero la pestaña pulsada responde en el mismo instante. Como
 * solo cambian los `searchParams`, el `loading.tsx` no vuelve a mostrarse y,
 * sin esto, la pantalla quedaba quieta hasta que llegaban los datos: ahora la
 * pestaña cambia el contador por un indicador de espera mientras se abre.
 */
export function ViewTabs({ label, tabs }: { label: string; tabs: PanelTab[] }) {
  return (
    <nav aria-label={label} className="-m-1 overflow-x-auto p-1">
      <div className="inline-flex min-w-full gap-1 rounded-tarjeta border border-borde bg-superficie p-1 shadow-1">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={tab.active ? "page" : undefined}
            className={cx(
              "foco inline-flex min-h-11 shrink-0 items-center gap-2 rounded-control px-4 text-[15px] font-semibold transition-colors duration-150 ease-out motion-reduce:transition-none",
              tab.active
                ? "bg-marca-50 text-marca-800 ring-1 ring-inset ring-marca-200"
                : "text-tinta-suave hover:bg-lienzo hover:text-tinta",
            )}
          >
            {tab.label}
            <TabCount count={tab.count} active={tab.active} />
          </Link>
        ))}
      </div>
    </nav>
  );
}
