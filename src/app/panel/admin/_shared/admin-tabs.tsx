"use client";

import Link, { useLinkStatus } from "next/link";
import { IconSpinner } from "@/components/icons";
import type { PanelTab } from "@/components/panel-ui";
import { cx } from "@/components/ui-classes";
import { formatCount } from "./format";
import { ADMIN_TAB_ACTIVE_CLASS, ADMIN_TAB_CLASS, ADMIN_TABS_GRID_CLASS, ADMIN_TABS_ROW_CLASS } from "./tab-classes";

/**
 * Contador de la pestaña, o un indicador de espera mientras se abre. Tiene
 * que vivir dentro del `Link` para leer su estado con `useLinkStatus`. La
 * región `role="status"` queda siempre montada y solo cambia su texto: una
 * región viva que aparece junto con su texto no se anuncia de forma fiable.
 */
function TabStatus({ count, active }: { count?: number; active: boolean }) {
  const { pending } = useLinkStatus();
  return (
    <>
      <span role="status" className="sr-only">
        {pending ? "Abriendo…" : ""}
      </span>
      {pending ? (
        <span aria-hidden="true" className="inline-flex min-w-6 items-center justify-center">
          <IconSpinner className="size-4 animate-spin motion-reduce:animate-none" />
        </span>
      ) : typeof count === "number" ? (
        <span
          className={cx(
            "tabular min-w-6 rounded-pastilla px-2 py-0.5 text-center text-xs font-bold",
            active ? "bg-marca-600 text-white" : "bg-lienzo text-tinta-suave",
          )}
        >
          {formatCount(count)}
        </span>
      ) : null}
    </>
  );
}

/**
 * Pestañas de las pantallas del administrador (periodo del tablero y de
 * movimientos, estados de mensajes): las mismas medidas y estilos que
 * `PanelTabs`, pero la pestaña pulsada responde en el mismo instante. Como
 * solo cambian los `searchParams`, el `loading.tsx` no vuelve a mostrarse y,
 * sin esto, la pantalla quedaba quieta hasta que llegaba la silueta de la
 * zona de datos: ahora la pestaña muestra un indicador de espera.
 *
 * `grid` reparte las pestañas en dos columnas en el teléfono (las cuatro del
 * periodo quedan en 2 × 2).
 */
export function AdminTabs({ label, tabs, grid = false }: { label: string; tabs: PanelTab[]; grid?: boolean }) {
  return (
    <nav aria-label={label}>
      <div className={grid ? ADMIN_TABS_GRID_CLASS : ADMIN_TABS_ROW_CLASS}>
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={tab.active ? "page" : undefined}
            className={cx(
              ADMIN_TAB_CLASS,
              "foco transition-colors duration-150 ease-out motion-reduce:transition-none",
              tab.active ? ADMIN_TAB_ACTIVE_CLASS : "text-tinta-suave hover:bg-lienzo hover:text-tinta",
            )}
          >
            {tab.label}
            <TabStatus count={tab.count} active={tab.active} />
          </Link>
        ))}
      </div>
    </nav>
  );
}
