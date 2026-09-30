"use client";

import { useEffect } from "react";

/** Parámetros de la URL con el resultado de una acción del panel. */
const FEEDBACK_PARAMS = ["ok", "error"] as const;

/**
 * Quita `?ok=` y `?error=` de la barra de direcciones una vez mostrado el
 * aviso (spec 6.3), sin navegar ni volver a pedir la página: el aviso sigue
 * en pantalla, pero al recargar ya no reaparece. Conserva el resto de los
 * parámetros (pestaña, filtros, panel lateral abierto).
 *
 * El efecto corre en cada render a propósito (sin lista de dependencias):
 * una segunda acción que redirige a la misma página con otro `?ok=` vuelve a
 * renderizar este componente sin remontarlo, y también hay que limpiarla. Si
 * la URL ya está limpia no hace nada, así que no hay bucle.
 */
export function ClearFeedbackParams() {
  useEffect(() => {
    const url = new URL(window.location.href);
    let changed = false;
    for (const param of FEEDBACK_PARAMS) {
      if (url.searchParams.has(param)) {
        url.searchParams.delete(param);
        changed = true;
      }
    }
    if (!changed) return;
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  });

  return null;
}
