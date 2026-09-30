"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Isotipo } from "@/components/logo";
import { buttonClass } from "@/components/ui-classes";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Error inesperado dentro de la app del pasajero (spec 6.6). Se muestra
 * debajo de la cabecera y encima de la barra de navegación de siempre, para
 * que la persona no se sienta perdida: puede reintentar o volver al inicio.
 */
export default function MiError({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center gap-4 rounded-tarjeta border border-borde bg-superficie px-6 py-10 text-center shadow-1">
      <title>Algo salió mal · TicketRuta</title>
      <Isotipo tone="marca" decorative className="h-16 w-auto" />
      <h1 className="text-2xl font-bold tracking-tight text-tinta sm:text-3xl">Algo salió mal de nuestro lado</h1>
      <p className="max-w-sm leading-relaxed text-tinta-suave">
        No es tu culpa. Intenta de nuevo; lo que ya guardaste no se perdió.
      </p>
      <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
        <button type="button" onClick={reset} className={buttonClass("primario")}>
          Intentar de nuevo
        </button>
        <Link href="/mi" className={buttonClass("secundario")}>
          Volver al inicio
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
