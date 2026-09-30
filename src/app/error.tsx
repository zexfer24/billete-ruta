"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Logo } from "@/components/logo";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Pantalla de error de marca (spec 6.6) para cualquier ruta que falle al
 * mostrarse. La acción principal reintenta; volver al inicio queda como
 * salida secundaria.
 */
export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Deja rastro en la consola del navegador para poder diagnosticar la falla.
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <title>Algo salió mal · TicketRuta</title>
      <div className="w-full max-w-md rounded-tarjeta border border-borde bg-superficie p-8 text-center shadow-1">
        <Logo tone="marca" className="mx-auto h-24 w-auto" />
        <h1 className="mt-6 text-2xl font-bold tracking-tight text-tinta sm:text-3xl">
          Algo salió mal de nuestro lado
        </h1>
        <p className="mt-3 text-base leading-relaxed text-tinta-suave">
          No es tu culpa. Intenta de nuevo; si el problema sigue, vuelve al inicio y prueba
          otra vez en unos minutos.
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <button
            type="button"
            onClick={reset}
            className="foco inline-flex min-h-12 w-full cursor-pointer items-center justify-center rounded-pastilla bg-marca-600 px-6 text-base font-semibold text-white transition-colors duration-150 ease-out hover:bg-marca-700 motion-reduce:transition-none"
          >
            Intentar de nuevo
          </button>
          <Link
            href="/"
            className="foco inline-flex min-h-12 w-full items-center justify-center rounded-pastilla border border-borde-control bg-superficie px-6 text-base font-semibold text-marca-700 transition-colors duration-150 ease-out hover:bg-marca-50 motion-reduce:transition-none"
          >
            Ir al inicio
          </Link>
        </div>
        {error.digest ? (
          <p className="mt-6 text-sm text-tinta-tenue">
            Si pides ayuda, menciona este código: <span className="tabular">{error.digest}</span>
          </p>
        ) : null}
      </div>
    </main>
  );
}
