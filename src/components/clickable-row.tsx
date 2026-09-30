"use client";

import type { MouseEvent, ReactNode } from "react";
import { useRouter } from "next/navigation";

const INTERACTIVE_SELECTOR = "a, button, input, select, textarea, label, summary, form";

/**
 * Fila de tabla que navega al hacer clic, salvo que el clic sea sobre un
 * elemento interactivo propio (enlace, botón, campo) o que la persona esté
 * seleccionando texto. Cada página debe mantener un enlace visible en la fila
 * para el acceso por teclado. La fila elegida (`selected`) se marca con fondo
 * morado suave y `data-selected`.
 */
export function ClickableRow({
  href,
  children,
  selected,
  className,
}: {
  href: string;
  children: ReactNode;
  selected?: boolean;
  className?: string;
}) {
  const router = useRouter();

  function handleClick(event: MouseEvent<HTMLTableRowElement>) {
    const target = event.target as HTMLElement;
    if (target.closest(INTERACTIVE_SELECTOR)) return;
    // Quien arrastra para copiar una cédula o un código no quiere navegar.
    if (window.getSelection()?.toString()) return;

    if (event.metaKey || event.ctrlKey) {
      window.open(href, "_blank", "noopener");
      return;
    }

    router.push(href, { scroll: false });
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
