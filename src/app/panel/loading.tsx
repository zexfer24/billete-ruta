import { Skeleton, SkeletonScreen } from "@/components/skeleton";
import { SkeletonPageHeader, SkeletonStatCards } from "./_shared/skeletons";

/** Cinco columnas de ancho decreciente: una tabla genérica, sin títulos inventados. */
const NEUTRAL_COLUMNS = ["w-4/5", "w-2/3", "w-1/2", "w-2/3", "w-1/3"] as const;

/**
 * Silueta neutra de una pantalla del panel (spec 6.5). Envuelve todo
 * `/panel`, así que aparece mientras carga el layout del administrador,
 * mientras redirigen las rutas viejas o en cualquier pantalla sin skeleton
 * propio. Por eso no se parece a ninguna en concreto: cabecera sin texto,
 * tres tarjetas de cifra y una tabla desde `md`; por debajo, tres tarjetas,
 * como las listas reales del panel en el teléfono. El tablero del operador
 * tiene el suyo en `(tablero)/loading.tsx`.
 */
export default function PanelLoading() {
  return (
    <SkeletonScreen label="Cargando…" className="flex flex-col gap-6">
      <SkeletonPageHeader />
      <SkeletonStatCards count={3} />
      <div className="hidden overflow-hidden rounded-tarjeta border border-borde bg-superficie shadow-1 md:block">
        <div className="flex gap-4 border-b border-borde bg-lienzo px-4 py-3">
          {NEUTRAL_COLUMNS.map((_, col) => (
            <div key={col} className="flex-1">
              <Skeleton className="h-4 w-20 max-w-full rounded-pastilla" />
            </div>
          ))}
        </div>
        {Array.from({ length: 6 }, (_, row) => (
          <div key={row} className="flex items-center gap-4 border-b border-borde px-4 py-4 last:border-0">
            {NEUTRAL_COLUMNS.map((width, col) => (
              <div key={col} className="flex-1">
                <Skeleton className={`h-4 rounded-pastilla ${width}`} />
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-3 md:hidden">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col gap-3 rounded-tarjeta border border-borde bg-superficie p-4 shadow-1">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-5 w-2/3 rounded-pastilla" />
              <Skeleton className="h-4 w-1/2 rounded-pastilla" />
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {[0, 1].map((col) => (
                <div key={col} className="flex flex-col gap-1.5">
                  <Skeleton className="h-4 w-16 rounded-pastilla" />
                  <Skeleton className="h-5 w-24 max-w-full rounded-pastilla" />
                </div>
              ))}
            </div>
            <Skeleton className="h-11 w-full" />
          </div>
        ))}
      </div>
    </SkeletonScreen>
  );
}
