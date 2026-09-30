"use client";

import { useEffect } from "react";
import { PublicCard, PublicShell } from "@/app/_publico/public-shell";
import { buttonClass } from "@/components/ui-classes";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Pantalla de error de marca (spec 6.6) para cualquier ruta que falle al
 * mostrarse. Misma estructura que las pantallas públicas de un solo
 * propósito: el enlace de arriba vuelve al inicio y la acción principal
 * reintenta.
 */
export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Deja rastro en la consola del navegador para poder diagnosticar la falla.
    console.error(error);
  }, [error]);

  return (
    <PublicShell>
      <title>Algo salió mal · TicketRuta</title>
      <PublicCard
        title="Algo salió mal de nuestro lado"
        description="No es tu culpa. Intenta de nuevo; si el problema sigue, vuelve al inicio y prueba otra vez en unos minutos."
      >
        <button type="button" onClick={reset} className={buttonClass("primario", "w-full", "lg")}>
          Intentar de nuevo
        </button>
        {error.digest ? (
          <p className="text-sm text-tinta-tenue">
            Si pides ayuda, menciona este código: <span className="tabular">{error.digest}</span>
          </p>
        ) : null}
      </PublicCard>
    </PublicShell>
  );
}
