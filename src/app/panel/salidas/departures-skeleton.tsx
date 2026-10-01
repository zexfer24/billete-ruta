import { Skeleton } from "@/components/skeleton";
import { IconChevronRight } from "@/components/icons";
import { PANEL_TH_CLASS } from "@/components/panel-ui";
import { cx } from "@/components/ui-classes";
import { SkeletonButton } from "../_shared/skeletons";

/**
 * Cabeceras reales de la tabla de salidas, con los anchos fijos que la tabla
 * usa desde `xl`. Por debajo, como en la tabla real, la hora va encima de la
 * ruta en la misma columna ("Hora y ruta").
 */
const COLUMNAS = [
  { label: "Hora", className: "hidden w-20 xl:block" },
  { label: "Ruta", className: "min-w-0 flex-1", tabletLabel: "Hora y ruta" },
  { label: "Vehículo y chofer", className: "w-44" },
  { label: "Puestos", className: "w-44" },
  { label: "Estado", className: "w-44" },
  { label: "", className: "w-32" },
] as const;

/**
 * Filas por grupo: "Hoy" y "Mañana" suelen traer cinco o seis salidas cada
 * uno, así la página no crece varias filas al llegar los datos.
 */
const FILAS_POR_GRUPO = [5, 5] as const;

/**
 * Silueta de la lista de salidas: la frase de resumen, un grupo por día con
 * sus filas (tabla con sus cabeceras reales en escritorio, tarjetas con barra
 * de puestos en el teléfono) y, al final (`moreButton`), el hueco del botón
 * «Ver los próximos días». Los botones llevan su texto real sobre el relleno
 * `.esqueleto`, sin borde ni color de enlace: todavía no responden.
 */
export function DeparturesListSkeleton({ moreButton = true }: { moreButton?: boolean } = {}) {
  return (
    <div aria-hidden="true" className="flex flex-col gap-6">
      {/* En el teléfono la frase real ocupa dos renglones. */}
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-4 w-full max-w-lg rounded-pastilla" />
        <Skeleton className="h-4 w-1/2 rounded-pastilla sm:hidden" />
      </div>
      {FILAS_POR_GRUPO.map((filas, grupo) => (
        <div key={grupo} className="flex flex-col gap-3">
          <Skeleton className="h-6 w-40 rounded-pastilla" />

          <div className="hidden overflow-hidden rounded-tarjeta border border-borde bg-superficie shadow-1 md:block">
            <div className="flex border-b border-borde bg-lienzo">
              {COLUMNAS.map((columna, i) => (
                <span key={i} className={cx(PANEL_TH_CLASS, columna.className)}>
                  {"tabletLabel" in columna ? (
                    <>
                      <span className="xl:hidden">{columna.tabletLabel}</span>
                      <span className="hidden xl:inline">{columna.label}</span>
                    </>
                  ) : (
                    columna.label
                  )}
                </span>
              ))}
            </div>
            {Array.from({ length: filas }, (_, fila) => (
              <div key={fila} className="flex items-center border-b border-borde last:border-0">
                <div className="hidden w-20 px-4 py-4 xl:block">
                  <Skeleton className="h-6 w-12" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1.5 px-4 py-4">
                  <Skeleton className="h-6 w-12 xl:hidden" />
                  <Skeleton className="h-4 w-3/5 rounded-pastilla" />
                </div>
                <div className="flex w-44 flex-col gap-1.5 px-4 py-4">
                  <Skeleton className="h-4 w-20 rounded-pastilla" />
                  <Skeleton className="h-3.5 w-28 rounded-pastilla" />
                </div>
                <div className="flex w-44 flex-col gap-1.5 px-4 py-4">
                  <Skeleton className="h-4 w-28 rounded-pastilla" />
                  <Skeleton className="h-2 w-full rounded-pastilla" />
                  <Skeleton className="h-3.5 w-16 rounded-pastilla" />
                </div>
                <div className="w-44 px-4 py-4">
                  {/* "Programada" va en texto, sin pastilla. */}
                  <Skeleton className="h-4 w-20 rounded-pastilla" />
                </div>
                <div className="flex w-32 justify-end px-4 py-4">
                  <SkeletonButton size="sm" className="px-3 whitespace-nowrap">
                    Ver detalle
                  </SkeletonButton>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3 md:hidden">
            {Array.from({ length: Math.min(filas, 3) }, (_, fila) => (
              // Misma forma que `DepartureCard`: hora (sin pastilla, porque una
              // salida programada no la lleva), ruta, placa y chofer, la fila
              // de puestos con "libres" a la derecha, la barra y "Ver detalle".
              <div key={fila} className="flex flex-col gap-3 rounded-tarjeta border border-borde bg-superficie p-4 shadow-1">
                <div className="flex flex-col gap-1">
                  <Skeleton className="h-7 w-14" />
                  <Skeleton className="h-6 w-3/5 rounded-pastilla" />
                </div>
                <Skeleton className="h-5 w-1/2 rounded-pastilla" />
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <Skeleton className="h-5 w-32 rounded-pastilla" />
                    <Skeleton className="h-5 w-16 rounded-pastilla" />
                  </div>
                  <Skeleton className="h-2 w-full rounded-pastilla" />
                </div>
                <span className="esqueleto inline-flex w-fit items-center gap-1 rounded-control px-1 text-sm font-semibold text-marca-700">
                  Ver detalle
                  <IconChevronRight className="size-4 shrink-0" />
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
      {/* Hueco de «Ver los próximos días (N salidas más)», inerte. El
          historial y la vista de todos los días no lo llevan. */}
      {moreButton ? <Skeleton className="h-11 w-full sm:w-72" /> : null}
    </div>
  );
}
