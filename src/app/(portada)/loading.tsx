import { DepartureBoardSkeleton } from "@/components/departure-board";
import { Skeleton, SkeletonScreen, SkeletonText } from "@/components/skeleton";
import { IconSearch } from "@/components/icons";
import { SearchCardPreview } from "@/components/search-card";
import { buttonClass, Card, SectionTitle } from "@/components/ui";
import {
  HowItWorks,
  PORTADA_COLUMN,
  PORTADA_SEARCH_TITLE,
  PORTADA_UPCOMING_HINT,
  PortadaFooter,
  PortadaHero,
} from "./portada-sections";

/**
 * Silueta de la portada (spec 6.5 y 2.2): el héroe, el logo, los textos fijos,
 * los pasos, el pie y el buscador (con sus etiquetas, sus valores iniciales y
 * el botón amarillo "Buscar salidas", quietos) se pintan reales desde el
 * primer instante. El acceso a la cuenta, el aviso de la cédula, el tablero
 * de salidas con su botón para ver todas y la tarjeta "¿Primera vez aquí?"
 * dependen de la sesión o de datos, así que van como bloques de carga con sus
 * medidas reales. La tarjeta se reserva porque la ve la mayoría (quien entra
 * sin sesión) y así el pie no salta al llegar la página.
 *
 * Solo la parte de carga va dentro de la región `role="status"`, y su
 * contenido es decorativo para lectores de pantalla: ellos oyen el aviso de
 * carga. El pie queda fuera, como hermano, para que su enlace se pueda usar
 * desde ya sin que se lea junto al aviso.
 */
export default function PortadaLoading() {
  return (
    <div className="min-h-dvh bg-lienzo">
      <SkeletonScreen label="Cargando las próximas salidas…">
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
                <p className="text-sm text-tinta-suave">{PORTADA_UPCOMING_HINT}</p>
              </div>
              <DepartureBoardSkeleton rows={4} />
              <Skeleton className="h-12 w-full rounded-pastilla sm:w-56" />
            </div>

            <Card className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Skeleton className="h-6 w-44 rounded-pastilla" />
                {/* La frase ocupa tres líneas en el teléfono y dos desde `sm`. */}
                <div className="sm:hidden">
                  <SkeletonText lines={3} />
                </div>
                <div className="hidden sm:block">
                  <SkeletonText lines={2} />
                </div>
              </div>
              <Skeleton className="h-12 w-full rounded-pastilla sm:w-40" />
            </Card>
          </div>
        </div>
      </SkeletonScreen>

      <PortadaFooter />
    </div>
  );
}
