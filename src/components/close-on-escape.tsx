"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Cliente mínimo del panel lateral: enfoca el panel al montar, bloquea el
 * desplazamiento del fondo mientras está abierto y cierra con la tecla Escape.
 * Escape no cierra el panel si el evento ya fue manejado (`defaultPrevented`),
 * si viene de una composición de IME (`isComposing`) o si el foco está en un
 * campo editable (`input`, `textarea`, `select` o `[contenteditable="true"]`):
 * así no se pierde lo que el operador estaba escribiendo.
 */
export function CloseOnEscape({ href }: { href: string }) {
  const router = useRouter();

  useEffect(() => {
    const panel = document.getElementById("panel-lateral");
    panel?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
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
