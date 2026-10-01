"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PublicCard, PublicShell } from "@/app/_publico/public-shell";
import { IconAlertCircle } from "@/components/icons";
import { buttonClass } from "@/components/ui-classes";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Pantalla de error de marca (spec 6.6) para cualquier ruta que falle al
 * mostrarse. Misma estructura que las pantallas públicas de un solo
 * propósito: el enlace de arriba vuelve al inicio y la acción principal
 * reintenta. Lleva el mismo icono en círculo que la 404 y el enlace vencido,
 * aquí en tono peligro porque sí es un error.
 */
export default function ErrorPage({ error, reset }: ErrorPageProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // `reset()` solo vuelve a pintar lo que ya estaba en el cliente, con la carga
  // de servidor que falló; `router.refresh()` la pide de nuevo. Juntos dentro
  // de una transición, el reintento de verdad vuelve a consultar los datos.
  function retry() {
    // Mientras reintenta, el botón sigue enfocable (aria-disabled) y el clic se ignora.
    if (isPending) return;
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
        eyebrow={
          <span
            aria-hidden="true"
            className="grid size-14 place-items-center rounded-full bg-peligro-suave text-peligro [&>svg]:size-7"
          >
            <IconAlertCircle />
          </span>
        }
        title="Algo salió mal de nuestro lado"
        description="No es tu culpa. Intenta de nuevo; si el problema sigue, vuelve al inicio y prueba otra vez en unos minutos."
      >
        <button
          type="button"
          onClick={retry}
          aria-disabled={isPending || undefined}
          aria-busy={isPending || undefined}
          className={buttonClass("primario", "w-full", "lg")}
        >
          {isPending ? "Intentando…" : "Intentar de nuevo"}
        </button>
        {/* Siempre montada: un lector de pantalla anuncia la espera aunque no relea el botón. */}
        <span className="sr-only" role="status">
          {isPending ? "Intentando…" : ""}
        </span>
        {error.digest ? (
          <p className="text-sm text-tinta-tenue">
            Si pides ayuda, menciona este código: <span className="tabular">{error.digest}</span>
          </p>
        ) : null}
      </PublicCard>
    </PublicShell>
  );
}
