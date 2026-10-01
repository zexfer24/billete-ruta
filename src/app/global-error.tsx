"use client";

import { useEffect } from "react";
import { IconArrowLeft } from "@/components/icons";
import { Logo } from "@/components/logo";
import { buttonClass } from "@/components/ui-classes";
import "./globals.css";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Último recurso (spec 6.6): se muestra cuando falla el propio layout raíz,
 * por eso trae su propio <html> y <body>. Usa la fuente del sistema porque la
 * de marca se carga en el layout que falló. Copia la estructura de
 * `PublicShell` (volver arriba, logo morado sobre la tarjeta) sin depender de
 * otras pantallas, y el enlace de volver recarga la página entera.
 */
export default function GlobalError({ error }: GlobalErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="es">
      <body className="bg-lienzo font-sans text-tinta antialiased">
        <title>Algo salió mal · TicketRuta</title>
        <div className="min-h-dvh bg-lienzo">
          <div className="mx-auto flex w-full max-w-md flex-col px-4 pb-12 pt-[max(1rem,env(safe-area-inset-top))]">
            <header>
              {/* Enlace nativo a propósito: recarga todo en vez de reusar el layout que falló. */}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a
                href="/"
                className="foco -ml-3 inline-flex min-h-11 items-center gap-2 rounded-pastilla px-3 text-base font-semibold text-marca-700 transition-colors duration-150 ease-out hover:bg-marca-50 motion-reduce:transition-none"
              >
                <IconArrowLeft aria-hidden="true" className="size-5" />
                Volver al inicio
              </a>
            </header>
            <main id="contenido" className="mt-4 flex flex-col gap-6">
              <Logo tone="marca" priority className="mx-auto h-20 w-auto" />
              <div className="flex flex-col gap-5 rounded-tarjeta border border-borde bg-superficie p-5 shadow-1 sm:p-6">
                <div className="flex flex-col gap-2">
                  <h1 className="text-balance text-2xl font-bold tracking-tight text-tinta sm:text-3xl">
                    Algo salió mal de nuestro lado
                  </h1>
                  <p className="text-base leading-relaxed text-tinta-suave">
                    No es tu culpa. Intenta de nuevo; si el problema sigue, prueba otra vez en unos
                    minutos.
                  </p>
                </div>
                {/* Recarga el documento completo: `reset()` solo vuelve a pintar lo que
                    ya falló y aquí no hay layout ni router en los que apoyarse. */}
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className={buttonClass("primario", "w-full", "lg")}
                >
                  Intentar de nuevo
                </button>
                {error.digest ? (
                  <p className="text-sm text-tinta-tenue">
                    Si pides ayuda, menciona este código:{" "}
                    <span className="tabular">{error.digest}</span>
                  </p>
                ) : null}
              </div>
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
