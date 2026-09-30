"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/** Elementos que pueden recibir el foco con Tab dentro del panel lateral. */
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

/** Misma ruta y mismos parámetros, sin importar el orden de los parámetros. */
function sameLocation(url: URL, pathname: string, search: string): boolean {
  if (url.origin !== window.location.origin || url.pathname !== pathname) return false;
  const a = new URLSearchParams(url.search);
  const b = new URLSearchParams(search);
  a.sort();
  b.sort();
  return a.toString() === b.toString();
}

/**
 * Busca en el contenido de la página el enlace que abre el panel con la URL
 * dada (la fila de la tabla o de la lista). Sirve cuando el panel se abrió
 * con un clic en una fila (`ClickableRow`) y el foco no estaba en un enlace.
 */
function findOpener(pathname: string, search: string): HTMLElement | null {
  const links = document.querySelectorAll<HTMLAnchorElement>("main a[href]");
  for (const link of links) {
    if (link.closest("#panel-lateral")) continue;
    try {
      if (sameLocation(new URL(link.href), pathname, search)) return link;
    } catch {
      // Un href que no es URL válida no puede ser el enlace que abrió el panel.
    }
  }
  return null;
}

/**
 * Cliente mínimo del panel lateral: enfoca el panel al montar, bloquea el
 * desplazamiento del fondo, mantiene el foco dentro del panel con Tab y
 * Mayús+Tab, y cierra con la tecla Escape. Al cerrarse devuelve el foco al
 * enlace que lo abrió (WCAG 2.4.3), para que quien usa teclado siga en la
 * misma fila de la tabla.
 * Escape no cierra el panel si el evento ya fue manejado (`defaultPrevented`),
 * si viene de una composición de IME (`isComposing`), si el foco está en un
 * campo editable (`input`, `textarea`, `select` o `[contenteditable="true"]`)
 * o si hay un diálogo de confirmación abierto encima: así no se pierde lo que
 * el operador estaba escribiendo ni se cierran dos cosas a la vez.
 */
export function CloseOnEscape({ href }: { href: string }) {
  const router = useRouter();
  // URL con la que se abrió el panel; se lee en un efecto normal, cuando el
  // enrutador ya la escribió en el historial.
  const openedAt = useRef<{ pathname: string; search: string } | null>(null);

  useEffect(() => {
    openedAt.current = { pathname: window.location.pathname, search: window.location.search };
  }, []);

  // Efecto de diseño, solo al montar: corre antes de que el efecto de abajo
  // enfoque el panel, así guarda el elemento que tenía el foco al abrirlo. Su
  // limpieza corre mientras el panel todavía está en el documento, antes de
  // quitarlo, y devuelve el foco al origen si sigue en la página.
  useLayoutEffect(() => {
    const panel = document.getElementById("panel-lateral");
    const active = document.activeElement;
    const origin =
      active instanceof HTMLElement && active !== document.body && !panel?.contains(active) ? active : null;

    return () => {
      const current = document.activeElement;
      // Si el foco ya está en otro elemento vivo fuera del panel, se respeta.
      const focusInPanel = !current || current === document.body || Boolean(panel?.contains(current));
      if (!focusInPanel) return;
      const opened = openedAt.current;
      const target = origin?.isConnected ? origin : opened ? findOpener(opened.pathname, opened.search) : null;
      target?.focus();
    };
  }, []);

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
