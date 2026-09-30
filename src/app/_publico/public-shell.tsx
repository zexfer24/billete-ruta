import Link from "next/link";
import type { ReactNode } from "react";
import { IconArrowLeft } from "@/components/icons";
import { Logo } from "@/components/logo";
import { Card } from "@/components/ui";

/**
 * Estructura de las pantallas públicas de un solo propósito (ingresar,
 * registro y lista de espera), spec 2.2 y 7.1: fondo lienzo, enlace de volver
 * de 44 px arriba, el logo completo morado centrado y una columna estrecha
 * para la tarjeta. Componente de servidor; también lo usan sus skeletons.
 */
export function PublicShell({
  backHref = "/",
  backLabel = "Volver al inicio",
  children,
}: {
  backHref?: string;
  backLabel?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-lienzo">
      <div className="mx-auto flex w-full max-w-md flex-col px-4 pb-12 pt-[max(1rem,env(safe-area-inset-top))]">
        <header>
          <Link
            href={backHref}
            className="foco -ml-3 inline-flex min-h-11 items-center gap-2 rounded-pastilla px-3 text-base font-semibold text-marca-700 transition-colors duration-150 ease-out hover:bg-marca-50 motion-reduce:transition-none"
          >
            <IconArrowLeft aria-hidden="true" className="size-5" />
            {backLabel}
          </Link>
        </header>
        <main id="contenido" className="mt-4 flex flex-col gap-6">
          <Logo tone="marca" priority className="mx-auto h-20 w-auto" />
          {children}
        </main>
      </div>
    </div>
  );
}

/**
 * Tarjeta principal de una pantalla pública: el `h1` único de la página, una
 * frase de para qué sirve y el contenido (formulario o mensaje).
 */
export function PublicCard({
  title,
  description,
  children,
  eyebrow,
}: {
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  /** Pieza pequeña encima del título, por ejemplo una pastilla de estado. */
  eyebrow?: ReactNode;
}) {
  return (
    <Card className="flex flex-col gap-5 sm:p-6">
      <div className="flex flex-col gap-2">
        {eyebrow ? <div>{eyebrow}</div> : null}
        <h1 className="text-balance text-2xl font-bold tracking-tight text-tinta sm:text-3xl">{title}</h1>
        {description ? <p className="text-base leading-relaxed text-tinta-suave">{description}</p> : null}
      </div>
      {children}
    </Card>
  );
}
