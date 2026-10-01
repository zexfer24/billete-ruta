import type { ReactNode } from "react";
import { IconMapPin } from "@/components/icons";
import { Isotipo, LogoLockup } from "@/components/logo";
import { Skeleton, SkeletonCircle, SkeletonText } from "@/components/skeleton";

/**
 * Siluetas de carga de las piezas de la app del pasajero (spec 6.5). Cada
 * una reproduce la forma real de su componente: mismas alturas, radios y
 * colores de fondo (la cabecera del ticket es morada de verdad, con el logo
 * y los textos fijos reales, spec 2.2.5 y 6.5). Van dentro
 * del `SkeletonScreen` de cada `loading.tsx`, que es el que anuncia la carga.
 */

/** Título de página real (conocido de antemano), con el mismo estilo del `h1`. */
export function SkeletonPageTitle({ children, subtitle }: { children: ReactNode; subtitle?: ReactNode }) {
  return (
    <div aria-hidden="true" className="flex flex-col gap-1">
      <p className="text-2xl font-bold tracking-tight text-tinta sm:text-3xl">{children}</p>
      {subtitle ? <p className="leading-relaxed text-tinta-suave">{subtitle}</p> : null}
    </div>
  );
}

/** Título de sección real, con el estilo de `SectionTitle`. */
export function SkeletonSectionTitle({ children }: { children: ReactNode }) {
  return (
    <p aria-hidden="true" className="text-lg font-semibold text-tinta">
      {children}
    </p>
  );
}

/** Perforación del ticket con sus dos muescas. */
function SkeletonPerforation() {
  return (
    <div aria-hidden="true" className="relative h-0 border-t-2 border-dashed border-marca-300">
      <span className="absolute -left-3 top-0 size-6 -translate-y-1/2 rounded-full border border-borde bg-lienzo" />
      <span className="absolute -right-3 top-0 size-6 -translate-y-1/2 rounded-full border border-borde bg-lienzo" />
    </div>
  );
}

/**
 * Ticket compacto: cabecera morada de 72 px, perforación y cuerpo con la ruta,
 * la agencia debajo y el estado. `withDeadline` agrega la línea del reloj
 * ("Paga hoy antes de las 21:02") y `withAction` el pie con la acción.
 */
export function SkeletonTicketCompact({
  withAction = false,
  withDeadline = false,
}: {
  withAction?: boolean;
  withDeadline?: boolean;
}) {
  return (
    <div aria-hidden="true" className="overflow-hidden rounded-tarjeta border border-borde bg-superficie shadow-1">
      <div className="flex items-center gap-3 bg-marca-600 p-4">
        <Isotipo tone="blanco" decorative className="h-10 w-auto shrink-0" />
        <div className="flex flex-1 flex-col gap-1">
          <p className="text-sm text-white/85">Salida</p>
          <Skeleton className="h-5 w-40 rounded-pastilla bg-white/20" />
        </div>
      </div>
      <SkeletonPerforation />
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-12" />
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-5 w-3/5 rounded-pastilla" />
            <Skeleton className="h-4 w-2/5 rounded-pastilla" />
          </div>
        </div>
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-6 w-28 rounded-pastilla" />
          <Skeleton className="h-4 w-32 rounded-pastilla" />
        </div>
        {withDeadline ? (
          <div className="flex min-h-5 items-center gap-2">
            <SkeletonCircle className="size-5" />
            <Skeleton className="h-4 w-52 max-w-full rounded-pastilla" />
          </div>
        ) : null}
        {withAction ? (
          <div className="flex items-center justify-between border-t border-borde pt-3">
            <Skeleton className="h-5 w-44 rounded-pastilla" />
            <Skeleton className="size-5" />
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Ticket grande del detalle: cabecera morada con logo, ruta y hora; cuerpo con
 * la agencia (y el estado debajo en el teléfono), la barra de pago, la caja
 * del código y la de "Dónde abordar", con sus etiquetas reales.
 */
export function SkeletonTicketLarge() {
  return (
    <div aria-hidden="true" className="overflow-hidden rounded-tarjeta border border-borde bg-superficie shadow-1">
      <div className="flex flex-col gap-4 bg-marca-600 p-5">
        <div className="flex items-center justify-between gap-3">
          <LogoLockup tone="blanco" />
          <Skeleton className="h-4 w-20 rounded-pastilla bg-white/20" />
        </div>
        <Skeleton className="h-7 w-4/5 rounded-pastilla bg-white/20" />
        <div className="flex items-end justify-between gap-3">
          <Skeleton className="h-5 w-40 rounded-pastilla bg-white/20" />
          <Skeleton className="h-8 w-20 rounded-pastilla bg-white/20" />
        </div>
      </div>
      <SkeletonPerforation />
      <div className="flex flex-col gap-4 p-5">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-12" />
          <div className="flex min-w-0 flex-1 flex-col items-start gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <Skeleton className="h-5 w-2/3 rounded-pastilla sm:w-48" />
            <Skeleton className="h-7 w-24 rounded-pastilla" />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-48 rounded-pastilla" />
          <Skeleton className="h-2 w-full rounded-pastilla" />
        </div>
        <div className="rounded-control bg-lienzo px-4 py-3">
          <p className="text-sm text-tinta-suave">Código de reserva</p>
          <Skeleton className="mt-1 h-6 w-56 max-w-full rounded-pastilla" />
        </div>
        <div className="flex items-start gap-3 rounded-control border border-marca-200 bg-marca-50 px-4 py-3">
          <IconMapPin aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-marca-600" />
          <div className="flex min-w-0 flex-1 flex-col">
            <p className="text-sm text-tinta-suave">Dónde abordar</p>
            <Skeleton className="mt-1 h-5 w-3/4 rounded-pastilla" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Aviso: círculo del icono, título, dos líneas y la acción separada por una línea. */
export function SkeletonNotice() {
  return (
    <div aria-hidden="true" className="rounded-tarjeta border border-borde bg-superficie p-4 shadow-1">
      <div className="flex gap-3">
        <SkeletonCircle className="size-10" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-5 w-3/5 rounded-pastilla" />
          <SkeletonText lines={2} />
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-borde pt-3">
        <Skeleton className="h-5 w-32 rounded-pastilla" />
        <Skeleton className="size-5" />
      </div>
    </div>
  );
}

/** Tarjeta blanca con el radio, borde y sombra de `Card`. */
export function SkeletonCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`rounded-tarjeta border border-borde bg-superficie p-5 shadow-1 ${className ?? ""}`}
    >
      {children}
    </div>
  );
}

/**
 * Tarjeta del viaje más cercano del inicio ("Tus otros viajes"): la frase de
 * cuándo sale, la línea del plazo y el pie con el estado y la acción.
 */
export function SkeletonOtherTrip() {
  return (
    <div aria-hidden="true" className="rounded-tarjeta border border-borde bg-superficie p-4 shadow-1">
      <Skeleton className="h-5 w-4/5 rounded-pastilla" />
      <div className="mt-2 flex min-h-5 items-center gap-2">
        <SkeletonCircle className="size-5" />
        <Skeleton className="h-4 w-48 max-w-full rounded-pastilla" />
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-borde pt-3">
        <Skeleton className="h-6 w-24 rounded-pastilla" />
        <Skeleton className="h-5 w-32 rounded-pastilla" />
      </div>
    </div>
  );
}
