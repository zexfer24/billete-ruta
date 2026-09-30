import { Skeleton } from "@/components/skeleton";
import { PANEL_TH_CLASS } from "@/components/panel-ui";
import { cx } from "@/components/ui-classes";

/** Cabeceras reales de la tabla de salidas, con los mismos anchos. */
const COLUMNAS = [
  { label: "Hora", className: "w-32" },
  { label: "Ruta", className: "flex-1" },
  { label: "Vehículo y chofer", className: "flex-1" },
  { label: "Puestos", className: "w-52" },
  { label: "Estado", className: "w-32" },
  { label: "", className: "w-32" },
] as const;

/**
 * Silueta de la lista de salidas: la frase de resumen y un grupo por día con
 * sus filas (tabla con sus cabeceras reales en escritorio, tarjetas con barra
 * de puestos en el teléfono).
 */
export function DeparturesListSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-6">
      <Skeleton className="h-4 w-full max-w-lg rounded-pastilla" />
      {[4, 2].map((filas, grupo) => (
        <div key={grupo} className="flex flex-col gap-3">
          <Skeleton className="h-6 w-40 rounded-pastilla" />

          <div className="hidden overflow-hidden rounded-tarjeta border border-borde bg-superficie shadow-1 md:block">
            <div className="flex border-b border-borde bg-lienzo">
              {COLUMNAS.map((columna, i) => (
                <span key={i} className={cx(PANEL_TH_CLASS, columna.className)}>
                  {columna.label}
                </span>
              ))}
            </div>
            {Array.from({ length: filas }, (_, fila) => (
              <div key={fila} className="flex items-center border-b border-borde last:border-0">
                <div className="w-32 px-4 py-4">
                  <Skeleton className="h-6 w-14" />
                </div>
                <div className="flex flex-1 flex-col gap-1.5 px-4 py-4">
                  <Skeleton className="h-4 w-3/5 rounded-pastilla" />
                </div>
                <div className="flex flex-1 flex-col gap-1.5 px-4 py-4">
                  <Skeleton className="h-4 w-20 rounded-pastilla" />
                  <Skeleton className="h-3.5 w-28 rounded-pastilla" />
                </div>
                <div className="flex w-52 flex-col gap-1.5 px-4 py-4">
                  <Skeleton className="h-4 w-32 rounded-pastilla" />
                  <Skeleton className="h-2 w-full rounded-pastilla" />
                  <Skeleton className="h-3.5 w-16 rounded-pastilla" />
                </div>
                <div className="w-32 px-4 py-4">
                  <Skeleton className="h-6 w-24 rounded-pastilla" />
                </div>
                <div className="flex w-32 justify-end px-4 py-4">
                  <Skeleton className="h-10 w-28" />
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3 md:hidden">
            {Array.from({ length: Math.min(filas, 3) }, (_, fila) => (
              <div key={fila} className="flex flex-col gap-3 rounded-tarjeta border border-borde bg-superficie p-4 shadow-1">
                <div className="flex items-start justify-between gap-2">
                  <Skeleton className="h-5 w-3/5 rounded-pastilla" />
                  <Skeleton className="h-6 w-24 rounded-pastilla" />
                </div>
                <Skeleton className="h-4 w-1/2 rounded-pastilla" />
                <div className="flex flex-col gap-1.5">
                  <Skeleton className="h-4 w-32 rounded-pastilla" />
                  <Skeleton className="h-2 w-full rounded-pastilla" />
                </div>
                <Skeleton className="h-4 w-24 rounded-pastilla" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
