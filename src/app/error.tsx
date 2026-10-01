"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // `reset()` solo vuelve a pintar lo que ya estaba en el cliente, con la carga
  // de servidor que falló; `router.refresh()` la pide de nuevo. Juntos dentro
  // de una transición, el reintento de verdad vuelve a consultar los datos.
  function retry() {
    startTransition(() => {
      router.refresh();
      reset();
    });
  }

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
        <button
          type="button"
          onClick={retry}
          disabled={isPending}
          aria-busy={isPending}
          className={buttonClass("primario", "w-full", "lg")}
        >
          {isPending ? "Intentando…" : "Intentar de nuevo"}
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
