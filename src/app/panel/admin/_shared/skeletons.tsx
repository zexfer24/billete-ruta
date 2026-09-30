import { Skeleton, SkeletonText } from "@/components/skeleton";

/**
 * Siluetas de carga de las pantallas del administrador (spec 6.5). Reproducen
 * las piezas reales del kit con sus alturas y radios: pestañas de 44 px,
 * tarjetas de cifra, tablas en escritorio y tarjetas en móvil. Son
 * decorativas: el anuncio lo hace `SkeletonScreen` en cada `loading.tsx`.
 */

const CARD = "rounded-tarjeta border border-borde bg-superficie shadow-1";

/** Pestañas de `PanelTabs`. */
export function TabsSkeleton({ widths = ["w-40", "w-20", "w-24", "w-32"] }: { widths?: string[] }) {
  return (
    <div className={`${CARD} flex gap-1 overflow-hidden p-1`}>
      {widths.map((width, index) => (
        <Skeleton key={index} className={`h-11 shrink-0 ${width}`} />
      ))}
    </div>
  );
}

/** Línea de texto secundario de 14 px, como el rango aplicado. */
export function LineSkeleton({ className = "w-72" }: { className?: string }) {
  return <Skeleton className={`h-4 max-w-full rounded-pastilla ${className}`} />;
}

/** Tarjeta de cifra (`StatCard`). */
export function StatCardSkeleton() {
  return (
    <div className={`${CARD} flex flex-col gap-3 p-5`}>
      <Skeleton className="h-4 w-36 rounded-pastilla" />
      <Skeleton className="h-9 w-24" />
      <Skeleton className="h-4 w-48 max-w-full rounded-pastilla" />
    </div>
  );
}

/** Formulario de filtros en una tarjeta: campos de 44 px con su etiqueta y un botón. */
export function FilterCardSkeleton({ fields = 1, wide = false }: { fields?: number; wide?: boolean }) {
  return (
    <div className={`${CARD} flex flex-wrap items-end gap-3 p-4`}>
      {Array.from({ length: fields }, (_, index) => (
        <div key={index} className={`flex flex-col gap-1.5 ${wide ? "min-w-60 flex-1" : "w-48"}`}>
          <Skeleton className="h-4 w-24 rounded-pastilla" />
          <Skeleton className="h-11 w-full" />
        </div>
      ))}
      <Skeleton className="h-11 w-full sm:w-32" />
    </div>
  );
}

/**
 * Tabla del panel: cabecera y filas en escritorio (`TableShell`), y tarjetas
 * con título, estado y datos en móvil (`MobileCard`).
 */
export function TableSkeleton({
  rows = 6,
  columns = 5,
  mobileCards = 3,
}: {
  rows?: number;
  columns?: number;
  mobileCards?: number;
}) {
  return (
    <>
      <div className={`${CARD} hidden overflow-hidden md:block`}>
        <div className="flex gap-6 border-b border-borde px-4 py-3.5">
          {Array.from({ length: columns }, (_, index) => (
            <Skeleton key={index} className="h-4 flex-1 rounded-pastilla" />
          ))}
        </div>
        {Array.from({ length: rows }, (_, row) => (
          <div key={row} className="flex items-center gap-6 border-b border-borde px-4 py-4 last:border-0">
            {Array.from({ length: columns }, (_, column) => (
              <div key={column} className="flex flex-1 flex-col gap-1.5">
                <Skeleton className={`h-4 rounded-pastilla ${column === 0 ? "w-4/5" : "w-3/5"}`} />
                {column < 2 ? <Skeleton className="h-3.5 w-2/5 rounded-pastilla" /> : null}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-3 md:hidden">
        {Array.from({ length: mobileCards }, (_, index) => (
          <div key={index} className={`${CARD} flex flex-col gap-3 p-4`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-1 flex-col gap-1.5">
                <Skeleton className="h-5 w-3/5 rounded-pastilla" />
                <Skeleton className="h-4 w-2/5 rounded-pastilla" />
              </div>
              <Skeleton className="h-6 w-20 rounded-pastilla" />
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {Array.from({ length: 4 }, (_, detail) => (
                <div key={detail} className="flex flex-col gap-1">
                  <Skeleton className="h-3.5 w-16 rounded-pastilla" />
                  <Skeleton className="h-4 w-24 rounded-pastilla" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/** Título de sección (`h2` de 18 px) con una línea de ayuda. */
export function SectionHeadingSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-6 w-56 max-w-full rounded-pastilla" />
      <SkeletonText lines={1} className="max-w-sm" />
    </div>
  );
}
