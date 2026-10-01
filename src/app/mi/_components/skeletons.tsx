import type { ReactNode } from "react";
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

/** Ticket compacto: cabecera morada de 72 px, perforación y cuerpo con la ruta, la agencia debajo y el estado. */
export function SkeletonTicketCompact({ withAction = false }: { withAction?: boolean }) {
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

/** Ticket grande: cabecera morada con logo, ruta y hora; cuerpo con agencia, QR o barra, y código. */
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
          <Skeleton className="h-5 flex-1 rounded-pastilla" />
          <Skeleton className="h-6 w-24 rounded-pastilla" />
        </div>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-48 rounded-pastilla" />
          <Skeleton className="h-2 w-full rounded-pastilla" />
          <Skeleton className="h-4 w-4/5 rounded-pastilla" />
        </div>
        <Skeleton className="h-16 w-full" />
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
