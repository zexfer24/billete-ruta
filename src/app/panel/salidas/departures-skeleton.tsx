import { Skeleton } from "@/components/skeleton";

/**
 * Silueta de la lista de salidas: la frase de resumen y un grupo por día con
 * sus filas (tabla en escritorio, tarjetas con barra de puestos en móvil).
 */
export function DeparturesListSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-6">
      <Skeleton className="h-4 w-full max-w-lg rounded-pastilla" />
      {[4, 2].map((filas, grupo) => (
        <div key={grupo} className="flex flex-col gap-3">
          <Skeleton className="h-6 w-40 rounded-pastilla" />

          <div className="hidden overflow-hidden rounded-tarjeta border border-borde bg-superficie shadow-1 md:block">
            <div className="h-11 border-b border-borde bg-lienzo" />
            {Array.from({ length: filas }, (_, fila) => (
              <div key={fila} className="flex items-center gap-6 border-b border-borde px-4 py-3.5 last:border-0">
                <Skeleton className="h-6 w-14" />
                <div className="flex flex-1 flex-col gap-1.5">
                  <Skeleton className="h-4 w-3/5 rounded-pastilla" />
                  <Skeleton className="h-3.5 w-2/5 rounded-pastilla" />
                </div>
                <div className="flex flex-1 flex-col gap-1.5">
                  <Skeleton className="h-4 w-20 rounded-pastilla" />
                  <Skeleton className="h-3.5 w-28 rounded-pastilla" />
                </div>
                <div className="flex w-52 flex-col gap-1.5">
                  <Skeleton className="h-4 w-32 rounded-pastilla" />
                  <Skeleton className="h-2 w-full rounded-pastilla" />
                </div>
                <Skeleton className="h-6 w-24 rounded-pastilla" />
                <Skeleton className="h-10 w-28" />
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3 md:hidden">
            {Array.from({ length: Math.min(filas, 3) }, (_, fila) => (
              <div key={fila} className="flex flex-col gap-3 rounded-tarjeta border border-borde bg-superficie p-4 shadow-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-1 flex-col gap-1.5">
                    <Skeleton className="h-5 w-3/4 rounded-pastilla" />
                    <Skeleton className="h-4 w-1/2 rounded-pastilla" />
                  </div>
                  <Skeleton className="h-6 w-24 rounded-pastilla" />
                </div>
                <div className="grid grid-cols-2 gap-x-4">
                  <Skeleton className="h-9 w-24" />
                  <Skeleton className="h-9 w-28" />
                </div>
                <Skeleton className="h-2 w-full rounded-pastilla" />
                <Skeleton className="h-11 w-full" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
