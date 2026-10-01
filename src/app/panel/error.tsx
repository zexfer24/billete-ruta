"use client";

import { startTransition, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { PanelPageHeader, panelButtonClass } from "@/components/panel-ui";
import { panelHomeForPath } from "@/lib/panel-nav";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Error inesperado dentro del panel (spec 6.6). Se pinta dentro del marco del
 * panel, con el menú de siempre, en vez del límite raíz que lo reemplazaría y
 * mandaría al operador a la portada pública. "Intentar de nuevo" vuelve a
 * pedir los datos al servidor (`router.refresh()`) antes de reiniciar el
 * límite: con solo `reset()` se repetiría el mismo error ya recibido.
 */
export default function PanelError({ error, reset }: ErrorPageProps) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Deja rastro en la consola del navegador para poder diagnosticar la falla.
    console.error(error);
  }, [error]);

  function retry() {
    startTransition(() => {
      router.refresh();
      reset();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <title>Algo salió mal · TicketRuta</title>
      <PanelPageHeader
        title="Algo salió mal de nuestro lado"
        description="Lo que ya guardaste no se perdió. Intenta de nuevo; si el problema sigue, vuelve al tablero y prueba otra vez en unos minutos."
      />
      <div className="flex flex-col gap-3 sm:flex-row">
        <button type="button" onClick={retry} className={panelButtonClass("primario", "lg")}>
          Intentar de nuevo
        </button>
        <Link href={panelHomeForPath(pathname)} className={panelButtonClass("secundario", "lg")}>
          Volver al tablero
        </Link>
      </div>
      {error.digest ? (
        <p className="text-sm text-tinta-tenue">
          Si pides ayuda, menciona este código: <span className="tabular">{error.digest}</span>
        </p>
      ) : null}
    </div>
  );
}
