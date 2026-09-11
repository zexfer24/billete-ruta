"use client";

import type { MouseEvent, ReactNode } from "react";
import { useRouter } from "next/navigation";

const INTERACTIVE_SELECTOR = "a, button, input, select, textarea, label, summary, form";

/**
 * Fila de tabla que navega al hacer clic, salvo que el clic sea sobre un
 * elemento interactivo propio (enlace, botón, campo). Cada página debe
 * mantener un enlace visible en la fila para el acceso por teclado.
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

    if (event.metaKey || event.ctrlKey) {
      window.open(href, "_blank");
      return;
    }

    router.push(href, { scroll: false });
  }

  const classes = [
    "cursor-pointer transition-colors hover:bg-[var(--color-acento-suave)]",
    selected ? "bg-[var(--color-acento-suave)]" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <tr onClick={handleClick} className={classes}>
      {children}
    </tr>
  );
}
