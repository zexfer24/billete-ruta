import { DepartureBoardSkeleton } from "@/components/departure-board";
import { Skeleton, SkeletonScreen } from "@/components/skeleton";
import { SectionTitle } from "@/components/ui";
import {
  HowItWorks,
  PORTADA_COLUMN,
  PORTADA_SEARCH_TITLE,
  PortadaFooter,
  PortadaHero,
} from "./portada-sections";

/**
 * Silueta de la portada (spec 6.5 y 2.2): el héroe, el logo, los textos fijos,
 * los pasos y el pie se pintan reales desde el primer instante; solo el
 * buscador, el acceso a la cuenta y el tablero de salidas, que dependen de
 * datos, van como bloques de carga con sus medidas reales. Salvo el pie, el
 * contenido visible es decorativo para lectores de pantalla: ellos oyen el
 * aviso de carga.
 */
export default function PortadaLoading() {
  return (
    <SkeletonScreen label="Cargando las próximas salidas…" className="min-h-dvh bg-lienzo">
      <div aria-hidden="true">
        <PortadaHero action={<Skeleton className="h-11 w-28 rounded-pastilla bg-white/20" />}>
          <div className="rounded-tarjeta bg-marca-700 p-4 sm:p-5">
            <p className="mb-3 text-lg font-semibold text-white">{PORTADA_SEARCH_TITLE}</p>
            <div className="flex items-center gap-3">
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <Skeleton className="h-14 w-full bg-white/20" />
                <Skeleton className="h-14 w-full bg-white/20" />
              </div>
              <Skeleton className="h-14 w-16 shrink-0 bg-white/10" />
            </div>
            <Skeleton className="mt-4 h-14 w-full rounded-pastilla bg-white/20" />
            <Skeleton className="mt-2 h-5 w-4/5 rounded-pastilla bg-white/10" />
          </div>
        </PortadaHero>

        <div className={`${PORTADA_COLUMN} flex flex-col gap-8 py-8`}>
          <HowItWorks />

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <SectionTitle>Próximas salidas</SectionTitle>
              <p className="text-sm text-tinta-suave">
                Salen en las próximas 6 horas y todavía tienen puestos. Toca una para reservar.
              </p>
            </div>
            <DepartureBoardSkeleton rows={4} />
          </div>
        </div>
      </div>

      {/* El pie queda fuera de la parte oculta: su enlace se puede usar desde ya. */}
      <PortadaFooter />
    </SkeletonScreen>
  );
}
