import { DepartureBoardSkeleton } from "@/components/departure-board";
import { Skeleton, SkeletonScreen } from "@/components/skeleton";
import { IconSearch } from "@/components/icons";
import { SearchCardPreview } from "@/components/search-card";
import { buttonClass, SectionTitle } from "@/components/ui";
import {
  HowItWorks,
  PORTADA_COLUMN,
  PORTADA_SEARCH_TITLE,
  PortadaFooter,
  PortadaHero,
} from "./portada-sections";

/**
 * Silueta de la portada (spec 6.5 y 2.2): el héroe, el logo, los textos fijos,
 * los pasos, el pie y el buscador (con sus etiquetas, sus valores iniciales y
 * el botón amarillo "Buscar salidas", quietos) se pintan reales desde el
 * primer instante; solo el acceso a la cuenta, el aviso de la cédula y el
 * tablero de salidas, que dependen de la sesión o de datos, van como bloques
 * de carga con sus medidas reales. Salvo el pie, el contenido visible es
 * decorativo para lectores de pantalla: ellos oyen el aviso de carga.
 */
export default function PortadaLoading() {
  return (
    <SkeletonScreen label="Cargando las próximas salidas…" className="min-h-dvh bg-lienzo">
      <div aria-hidden="true">
        <PortadaHero action={<Skeleton className="h-11 w-28 rounded-pastilla bg-white/20" />}>
          <SearchCardPreview title={PORTADA_SEARCH_TITLE}>
            <span className={buttonClass("acento", "w-full", "lg")}>
              <IconSearch aria-hidden="true" className="size-5" />
              Buscar salidas
            </span>
            <Skeleton className="h-5 w-4/5 rounded-pastilla bg-white/10" />
          </SearchCardPreview>
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
