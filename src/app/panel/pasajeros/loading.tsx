import { Skeleton, SkeletonButton, SkeletonScreen } from "@/components/skeleton";
import { IconCash, IconDownload } from "@/components/icons";
import { ListSkeleton, TabsSkeleton } from "./skeletons";

/** Etiquetas fijas de las cinco pestañas, en el mismo orden que la página. */
const TAB_LABELS = ["Por revisar", "Por cobrar", "Pagadas", "Anuladas", "Todas"] as const;

/**
 * Silueta de "Pasajeros y pagos" mientras llega la página (spec 6.5): el
 * título, los dos botones y las cinco pestañas con sus textos reales (el
 * contador en barra), y la lista. Ninguna pestaña va marcada y no se pintan
 * los filtros: sin vista en la URL, la página abre "Por revisar" (que no
 * tiene filtros) o "Todas" según haya comprobantes esperando, y desde el
 * tablero se llega con `?vista=pagadas` o `?vista=por-cobrar`: este archivo no
 * puede saberlo. Por eso la lista va en su variante neutra: solo pinta reales
 * las cabeceras que comparten las dos tablas ("Pasajero" y "Viaje") y deja en
 * barra las otras y la acción de cada fila, para no mostrar un momento botones
 * "Revisar" que luego son "Ver detalle". Los filtros llegan junto con la lista.
 */
export default function PasajerosLoading() {
  return (
    <SkeletonScreen label="Cargando pasajeros y pagos…" className="flex flex-col gap-6">
      <div aria-hidden="true" className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-3xl">
          <p className="text-2xl font-bold tracking-tight text-tinta sm:text-3xl">Pasajeros y pagos</p>
          <p className="mt-1.5 text-base leading-relaxed text-tinta-suave">
            Revisa los comprobantes que envían los pasajeros, cobra lo que falta y consulta cada reserva.
          </p>
        </div>
        <div className="flex min-w-0 max-w-full flex-wrap gap-2">
          {/* Quietos: el cobro con el brillo de carga en vez del borde, la
              descarga (fantasma, sin fondo) con su texto en tinta-suave. */}
          <SkeletonButton className="w-full sm:w-auto">
            <IconCash className="size-5" />
            Registrar un cobro
          </SkeletonButton>
          <SkeletonButton ghost className="w-full sm:w-auto">
            <IconDownload className="size-5" />
            Descargar en Excel (CSV)
          </SkeletonButton>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <TabsSkeleton labels={TAB_LABELS} />
        <Skeleton className="h-5 w-96 max-w-full rounded-pastilla" />
      </div>

      <ListSkeleton variant="neutra" />
    </SkeletonScreen>
  );
}
