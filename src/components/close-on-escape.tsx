"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Cliente mínimo del panel lateral: enfoca el panel al montar, bloquea el
 * desplazamiento del fondo mientras está abierto y cierra con la tecla Escape.
 */
export function CloseOnEscape({ href }: { href: string }) {
  const router = useRouter();

  useEffect(() => {
    const panel = document.getElementById("panel-lateral");
    panel?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        router.replace(href, { scroll: false });
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [href, router]);

  return null;
}
