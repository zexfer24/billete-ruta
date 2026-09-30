"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Elementos que pueden recibir el foco con Tab dentro del panel lateral. */
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

/**
 * Cliente mínimo del panel lateral: enfoca el panel al montar, bloquea el
 * desplazamiento del fondo, mantiene el foco dentro del panel con Tab y
 * Mayús+Tab, y cierra con la tecla Escape.
 * Escape no cierra el panel si el evento ya fue manejado (`defaultPrevented`),
 * si viene de una composición de IME (`isComposing`), si el foco está en un
 * campo editable (`input`, `textarea`, `select` o `[contenteditable="true"]`)
 * o si hay un diálogo de confirmación abierto encima: así no se pierde lo que
 * el operador estaba escribiendo ni se cierran dos cosas a la vez.
 */
export function CloseOnEscape({ href }: { href: string }) {
  const router = useRouter();

  useEffect(() => {
    const panel = document.getElementById("panel-lateral");
    panel?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function trapFocus(event: KeyboardEvent) {
      if (!panel) return;
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (element) => element.offsetParent !== null || element === document.activeElement,
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const active = document.activeElement;
      if (!panel.contains(active)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && (active === first || active === panel)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      // Un <dialog> modal abierto (ConfirmDialog) maneja su propio teclado.
      if (document.querySelector("dialog[open]")) return;

      if (event.key === "Tab") {
        trapFocus(event);
        return;
      }

      if (event.key !== "Escape") return;
      if (event.defaultPrevented || event.isComposing) return;
      const target = event.target as HTMLElement | null;
      if (target?.matches('input, textarea, select, [contenteditable="true"]')) return;
      router.replace(href, { scroll: false });
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [href, router]);

  return null;
}
