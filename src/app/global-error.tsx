"use client";

import { useEffect } from "react";
import { Logo } from "@/components/logo";
import "./globals.css";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Último recurso (spec 6.6): se muestra cuando falla el propio layout raíz,
 * por eso trae su propio <html> y <body>. Usa la fuente del sistema porque la
 * de marca se carga en el layout que falló.
 */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="es">
      <body className="bg-lienzo font-sans text-tinta antialiased">
        <title>Algo salió mal · TicketRuta</title>
        <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-12">
          <div className="w-full max-w-md rounded-tarjeta border border-borde bg-superficie p-8 text-center shadow-1">
            <Logo tone="marca" className="mx-auto h-24 w-auto" />
            <h1 className="mt-6 text-2xl font-bold tracking-tight text-tinta sm:text-3xl">
              Algo salió mal de nuestro lado
            </h1>
            <p className="mt-3 text-base leading-relaxed text-tinta-suave">
              No es tu culpa. Intenta de nuevo; si el problema sigue, prueba otra vez en unos
              minutos.
            </p>
            <button
              type="button"
              onClick={reset}
              className="foco mt-8 inline-flex min-h-12 w-full cursor-pointer items-center justify-center rounded-pastilla bg-marca-600 px-6 text-base font-semibold text-white transition-colors duration-150 ease-out hover:bg-marca-700 motion-reduce:transition-none"
            >
              Intentar de nuevo
            </button>
            {error.digest ? (
              <p className="mt-6 text-sm text-tinta-tenue">
                Si pides ayuda, menciona este código:{" "}
                <span className="tabular">{error.digest}</span>
              </p>
            ) : null}
          </div>
        </main>
      </body>
    </html>
  );
}
