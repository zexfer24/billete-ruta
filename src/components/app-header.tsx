import Link from "next/link";
import type { ReactNode } from "react";
import { IconArrowLeft } from "./icons";
import { Isotipo, LogoLockup } from "./logo";

export interface AppHeaderProps {
  title: string;
  subtitle?: string;
  /** Acciones de la fila del logo, a la derecha. Se recomienda `AppHeaderAction`. */
  right?: ReactNode;
  /** Ruta del botón "Volver". Sin ella no se muestra el botón. */
  back?: string;
  /** Cabecera más baja, para pantallas de un solo paso (ingresar, lista de espera). */
  compact?: boolean;
  /** Destino del logo. Por defecto, el inicio de la app del pasajero. */
  homeHref?: string;
  /**
   * Etiqueta del título. Por defecto es el `h1` único de la página. En un
   * layout compartido, donde cada página pone su propio `h1`, se usa `"p"`
   * para que el saludo no compita con el título real de la pantalla.
   */
  titleAs?: "h1" | "p";
}

/**
 * Cabecera morada de la app del pasajero (spec 6.4 y 2.2): arriba el logo
 * horizontal en blanco, que lleva al inicio, y las acciones; debajo, el botón
 * de volver opcional, el título y el subtítulo. El subtítulo se ve siempre,
 * también en modo compacto.
 */
export function AppHeader({
  title,
  subtitle,
  right,
  back,
  compact,
  homeHref = "/mi",
  titleAs = "h1",
}: AppHeaderProps) {
  const Title = titleAs;
  const titleClass =
    titleAs === "h1"
      ? compact
        ? "text-xl font-bold tracking-tight sm:text-2xl"
        : "text-2xl font-bold tracking-tight sm:text-3xl"
      : "text-lg font-semibold";

  return (
    <header
      className={[
        "rounded-b-tarjeta bg-marca-600 px-4 text-white",
        compact
          ? "pb-4 pt-[max(0.75rem,env(safe-area-inset-top))]"
          : "pb-6 pt-[max(1rem,env(safe-area-inset-top))]",
      ].join(" ")}
    >
      <div className="mx-auto w-full max-w-md md:max-w-2xl">
        {/*
          En pantallas de menos de 375 px el logo horizontal no cabe junto a
          las acciones: se muestra solo el isotipo (con su texto alternativo).
          La fila además puede partirse, para que nada se desborde nunca.
        */}
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
          <Link
            href={homeHref}
            className="foco-sobre-marca -ml-1 flex min-h-11 items-center rounded-control px-1"
          >
            <span className="min-[375px]:hidden">
              <Isotipo tone="blanco" className="h-9 w-auto" />
            </span>
            <span className="hidden min-[375px]:contents">
              <LogoLockup tone="blanco" />
            </span>
            <span className="sr-only">, ir al inicio</span>
          </Link>
          {right ? <div className="ml-auto flex shrink-0 items-start gap-1">{right}</div> : null}
        </div>

        <div className={["flex items-center gap-3", compact ? "mt-3" : "mt-5"].join(" ")}>
          {back ? (
            <Link
              href={back}
              className="foco-sobre-marca flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-pastilla bg-white/10 px-3 font-semibold transition-colors duration-150 ease-out hover:bg-white/20 motion-reduce:transition-none"
            >
              <IconArrowLeft aria-hidden="true" />
              <span className="sr-only sm:not-sr-only">Volver</span>
            </Link>
          ) : null}
          <div className="min-w-0 flex-1">
            <Title className={`break-words ${titleClass}`}>{title}</Title>
            {subtitle ? (
              <p className="tabular mt-0.5 break-words text-base text-white/85">{subtitle}</p>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}

export interface AppHeaderActionProps {
  href: string;
  /** Texto visible debajo del icono. */
  label: string;
  icon: ReactNode;
  /**
   * Enlace normal (`<a>`) en vez de `Link`, para rutas que no deben
   * precargarse ni resolverse en el cliente, como `/salir`.
   */
  plain?: boolean;
}

const ACTION_CLASS =
  "foco-sobre-marca flex min-h-14 min-w-14 flex-col items-center justify-center gap-0.5 rounded-control px-2 py-1 text-sm font-medium text-white transition-colors duration-150 ease-out hover:bg-white/10 motion-reduce:transition-none";

/** Acción de la cabecera: icono con su etiqueta visible debajo (spec 1.5 y 6.4). */
export function AppHeaderAction({ href, label, icon, plain }: AppHeaderActionProps) {
  const content = (
    <>
      <span className="flex size-6 items-center justify-center" aria-hidden="true">
        {icon}
      </span>
      {label}
    </>
  );

  if (plain) {
    return (
      <a href={href} className={ACTION_CLASS}>
        {content}
      </a>
    );
  }

  return (
    <Link href={href} className={ACTION_CLASS}>
      {content}
    </Link>
  );
}
