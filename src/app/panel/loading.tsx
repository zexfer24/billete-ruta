import { Skeleton, SkeletonScreen } from "@/components/skeleton";
import { SkeletonPageHeader, SkeletonStatCards } from "./_shared/skeletons";

/** Cinco columnas de ancho decreciente: una tabla genérica, sin títulos inventados. */
const NEUTRAL_COLUMNS = ["w-4/5", "w-2/3", "w-1/2", "w-2/3", "w-1/3"] as const;

/**
 * Silueta neutra de una pantalla del panel (spec 6.5). Envuelve todo
 * `/panel`, así que aparece mientras carga el layout del administrador,
 * mientras redirigen las rutas viejas o en cualquier pantalla sin skeleton
 * propio. Por eso no se parece a ninguna en concreto: cabecera sin texto,
 * tres tarjetas de cifra y una tabla. El tablero del operador tiene el suyo
 * en `(tablero)/loading.tsx`.
 */
export default function PanelLoading() {
  return (
    <SkeletonScreen label="Cargando…" className="flex flex-col gap-6">
      <SkeletonPageHeader />
      <SkeletonStatCards count={3} />
      <div className="overflow-hidden rounded-tarjeta border border-borde bg-superficie shadow-1">
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
    </SkeletonScreen>
  );
}
