"use client";

import Link, { useLinkStatus } from "next/link";
import { cx } from "@/components/ui-classes";
import { IconSpinner } from "@/components/icons";
import type { PanelTab } from "@/components/panel-ui";
import { TABS_CONTAINER_CLASS, tabItemLayoutClass } from "./tab-layout";

/** Contador con punto de miles, igual que la línea «Mostrando 1 a 25 de 1.199 reservas». */
const COUNT_FORMAT = new Intl.NumberFormat("es-VE", { maximumFractionDigits: 0 });

/**
 * Contador de la pestaña, o un indicador de espera mientras se abre. Tiene
 * que vivir dentro del `Link` para leer su estado con `useLinkStatus`. La
 * región `role="status"` queda siempre montada (vacía) y solo cambia su
 * texto: los lectores de pantalla no anuncian una región viva que aparece ya
 * con contenido.
 */
function TabCount({ count, active }: { count?: number; active: boolean }) {
  const { pending } = useLinkStatus();
  return (
    <>
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
          {COUNT_FORMAT.format(count)}
        </span>
      ) : null}
      <span role="status" className="sr-only">
        {pending ? "Abriendo…" : ""}
      </span>
    </>
  );
}

/**
 * Pestañas de "Pasajeros y pagos": el mismo aspecto que `PanelTabs` (bajan
 * de fila en vez de desplazarse de lado), con el reparto de dos filas parejas
 * en el teléfono de `tab-layout.ts`, y la pestaña pulsada responde en el
 * mismo instante. Como
 * solo cambian los `searchParams`, el `loading.tsx` no vuelve a mostrarse y,
 * sin esto, la pantalla quedaba quieta hasta que llegaban los datos: ahora la
 * pestaña cambia el contador por un indicador de espera mientras se abre.
 */
export function ViewTabs({ label, tabs }: { label: string; tabs: PanelTab[] }) {
  return (
    <nav aria-label={label}>
      <div className={TABS_CONTAINER_CLASS}>
        {tabs.map((tab, index) => (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={tab.active ? "page" : undefined}
            className={cx(
              "foco relative inline-flex min-h-11 grow items-center justify-center gap-2 rounded-control px-4 text-[15px] font-semibold transition-colors duration-150 ease-out motion-reduce:transition-none sm:grow-0 sm:justify-start",
              tabItemLayoutClass(index, tabs.length),
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
