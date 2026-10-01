"use client";

import type { MouseEvent, ReactNode } from "react";
import { useLinkStatus } from "next/link";
import { IconSpinner } from "@/components/icons";

/**
 * Icono de un enlace de "Pasajeros y pagos" que abre un panel lateral. Como
 * solo cambian los `searchParams`, el `loading.tsx` no vuelve a mostrarse y
 * la pantalla quedaba quieta hasta que llegaban los datos: mientras el enlace
 * se abre, su icono cambia por un indicador de espera y se anuncia
 * «Abriendo…». Tiene que vivir dentro del `Link` para leer su estado. Sin
 * `icon`, el indicador solo aparece durante la espera. El `Link` que lo
 * contiene debe llevar `relative` para contener el texto oculto.
 */
export function LinkPendingIcon({ icon }: { icon?: ReactNode }) {
  const { pending } = useLinkStatus();
  if (pending) {
    return (
      <span className="inline-flex shrink-0 items-center" role="status">
        <IconSpinner className="size-5 animate-spin motion-reduce:animate-none" />
        <span className="sr-only">Abriendo…</span>
      </span>
    );
  }
  return icon ?? null;
}

const INTERACTIVE_SELECTOR = "a, button, input, select, textarea, label, summary, form";

/**
 * Fila de tabla que, al hacer clic fuera de sus controles, pulsa el enlace de
 * la fila marcado con `data-row-link`. Así el clic en la fila y el clic en el
 * enlace son la misma navegación, y la fila también muestra el indicador de
 * espera del enlace (`LinkPendingIcon`) mientras se abre el panel lateral. El
 * resto del comportamiento es el de `ClickableRow`: no navega si se está
 * seleccionando texto, y con Ctrl o Cmd abre en otra pestaña.
 */
export function LinkRow({
  children,
  selected,
  className,
}: {
  children: ReactNode;
  selected?: boolean;
  className?: string;
}) {
  function handleClick(event: MouseEvent<HTMLTableRowElement>) {
    const target = event.target as HTMLElement;
    if (target.closest(INTERACTIVE_SELECTOR)) return;
    if (window.getSelection()?.toString()) return;
    const link = event.currentTarget.querySelector<HTMLAnchorElement>("a[data-row-link]");
    if (!link) return;
    if (event.metaKey || event.ctrlKey) {
      window.open(link.href, "_blank", "noopener");
      return;
    }
    link.click();
  }

  const classes = [
    "cursor-pointer transition-colors duration-150 ease-out motion-reduce:transition-none",
    selected ? "bg-marca-50" : "hover:bg-marca-50/60",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <tr onClick={handleClick} data-selected={selected ? "true" : undefined} className={classes}>
      {children}
    </tr>
  );
}
