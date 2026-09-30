import Link from "next/link";
import type { ReactNode } from "react";
import { IconCash, IconLock, IconQr, IconSearch } from "@/components/icons";
import { Logo, LogoLockup } from "@/components/logo";
import { Card } from "@/components/ui";

/**
 * Piezas fijas de la portada, compartidas por la página y su skeleton para
 * que la silueta de carga sea idéntica a la pantalla real (spec 6.5).
 * Componentes de servidor, sin datos.
 */

/** Ancho de la columna de la portada: el mismo en el héroe, el contenido y el pie. */
export const PORTADA_COLUMN = "mx-auto w-full max-w-md px-4 md:max-w-2xl";

/**
 * Héroe morado: logo blanco grande, acceso a la cuenta arriba a la derecha,
 * frase de propósito y, en `children`, el buscador.
 */
export function PortadaHero({ action, children }: { action?: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-b-tarjeta bg-marca-600 pb-8 pt-[max(1rem,env(safe-area-inset-top))] text-white">
      <div className={PORTADA_COLUMN}>
        <div className="flex items-start justify-between gap-3">
          <Logo tone="blanco" priority className="h-24 w-auto sm:h-28" />
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
        <h1 className="mt-5 text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Compra tu pasaje sin hacer cola
        </h1>
        <p className="mt-2 text-base leading-relaxed text-white/85">
          Elige tu salida, paga desde tu teléfono o en la taquilla y muestra tu ticket al subir al
          autobús.
        </p>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

/** Clase del acceso a la cuenta sobre el héroe: contorno blanco, 44 px, foco amarillo. */
export const HERO_ACTION_CLASS =
  "foco-sobre-marca inline-flex min-h-11 items-center gap-2 rounded-pastilla border border-white/70 px-4 text-sm font-semibold text-white transition-colors duration-150 ease-out hover:bg-white/10 motion-reduce:transition-none";

/** Título del buscador de la portada. */
export const PORTADA_SEARCH_TITLE = "¿A dónde viajas?";

const PASOS = [
  { titulo: "Busca", texto: "Elige a dónde y a qué hora viajas.", icono: <IconSearch /> },
  { titulo: "Paga", texto: "Desde tu teléfono o en la taquilla.", icono: <IconCash /> },
  { titulo: "Viaja", texto: "Muestra tu ticket al subir.", icono: <IconQr /> },
] as const;

/** Los tres pasos del servicio, con icono y una frase cada uno. */
export function HowItWorks() {
  return (
    <section aria-labelledby="como-funciona" className="flex flex-col gap-3">
      <h2 id="como-funciona" className="text-lg font-semibold text-tinta">
        Cómo funciona
      </h2>
      <Card className="p-4 sm:p-5">
        <ol className="grid grid-cols-3 gap-3 sm:gap-4">
          {PASOS.map((paso, indice) => (
            <li key={paso.titulo} className="flex flex-col items-center gap-2 text-center">
              <span
                aria-hidden="true"
                className="grid size-12 place-items-center rounded-full bg-marca-50 text-marca-600 [&>svg]:size-6"
              >
                {paso.icono}
              </span>
              <p className="text-base font-semibold text-tinta">
                <span aria-hidden="true">{indice + 1}. </span>
                {paso.titulo}
              </p>
              <p className="text-sm leading-snug text-tinta-suave">{paso.texto}</p>
            </li>
          ))}
        </ol>
      </Card>
    </section>
  );
}

/** Pie de la portada: logo del terminal, nota de horario y acceso del personal. */
export function PortadaFooter() {
  return (
    <footer className={`${PORTADA_COLUMN} pb-[max(2rem,env(safe-area-inset-bottom))]`}>
      <div className="flex flex-col items-center gap-3 border-t border-borde pt-6 text-center">
        <LogoLockup tone="marca" label="Terminal de pasajeros" />
        <p className="text-sm text-tinta-suave">Horas en formato de 24 horas, hora de Caracas.</p>
        <Link
          href="/panel/ingresar"
          className="foco inline-flex min-h-11 items-center gap-2 rounded-pastilla px-4 text-sm font-semibold text-tinta-suave transition-colors duration-150 ease-out hover:bg-marca-50 hover:text-marca-700 motion-reduce:transition-none"
        >
          <IconLock aria-hidden="true" className="size-5" />
          Acceso del personal
        </Link>
      </div>
    </footer>
  );
}
