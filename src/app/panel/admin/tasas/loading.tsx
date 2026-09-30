import { PANEL_LABEL_CLASS, PanelPageHeader, panelButtonClass } from "@/components/panel-ui";
import { Skeleton, SkeletonScreen } from "@/components/skeleton";

const CARD = "rounded-tarjeta border border-borde bg-superficie shadow-1";
const HINT = "Usa coma para los decimales, sin puntos de miles.";

/** Valor vigente con su etiqueta real; la cifra y la fecha van en barras. */
function CurrentValueSkeleton({ label }: { label: string }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm font-semibold text-tinta-suave">{label}</p>
      <Skeleton className="h-9 w-32" />
      <Skeleton className="mt-1 h-4 w-44 rounded-pastilla" />
    </div>
  );
}

/** Campo de la tasa nueva con su etiqueta, su ayuda y el botón, todos reales. */
function RateFieldSkeleton({ label, primary = false }: { label: string; primary?: boolean }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <p className={PANEL_LABEL_CLASS}>{label}</p>
        <Skeleton className="h-11 w-full" />
        <p className="text-sm leading-snug text-tinta-suave">{HINT}</p>
      </div>
      <div>
        <span className={panelButtonClass(primary ? "primario" : "secundario", "md", "w-full sm:w-auto")}>
          Guardar nueva tasa
        </span>
      </div>
    </div>
  );
}

function HistorySkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm font-semibold text-tinta-suave">Historial</p>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex justify-between gap-3 border-b border-borde py-2.5 last:border-0">
          <Skeleton className="h-5 w-24 rounded-pastilla" />
          <Skeleton className="h-4 w-52 max-w-[50%] rounded-pastilla" />
        </div>
      ))}
    </div>
  );
}

/** Cabecera de `SectionCard` con su título y su frase reales. */
function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="border-b border-borde px-5 py-4">
      <p className="text-lg font-semibold text-tinta">{title}</p>
      <p className="mt-1 text-sm leading-snug text-tinta-suave">{description}</p>
    </div>
  );
}

const EXCHANGE_BLOCKS = [
  { title: "Bolívar", label: "Nueva tasa, en bolívares por cada dólar" },
  { title: "Peso colombiano", label: "Nueva tasa, en pesos por cada dólar" },
] as const;

/**
 * Silueta de tasas: la tasa de salida y las dos tasas de cambio con su
 * historial. Los títulos, las etiquetas, las ayudas y los botones son textos
 * fijos y se pintan reales; los montos y las fechas van en barras.
 */
export default function TasasAdminLoading() {
  return (
    <SkeletonScreen label="Cargando las tasas…" className="flex flex-col gap-6">
      <PanelPageHeader
        title="Tasas y precios"
        description="La tasa de salida que paga cada pasajero y las tasas de cambio para cobrar en bolívares y en pesos. Un cambio solo aplica a las reservas nuevas: las que ya existen mantienen su precio."
      />

      <div aria-hidden="true" className={CARD}>
        <SectionHeader
          title="Tasa de salida"
          description="La cobra el terminal a cada pasajero, aparte de la tarifa de la agencia."
        />
        <div className="p-5">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <CurrentValueSkeleton label="Vigente, por pasajero" />
            <RateFieldSkeleton label="Nueva tasa de salida, en dólares por pasajero" primary />
          </div>
          <div className="mt-6 border-t border-borde pt-4">
            <HistorySkeleton />
          </div>
        </div>
      </div>

      <div aria-hidden="true" className={CARD}>
        <SectionHeader
          title="Tasas de cambio"
          description="Cuántos bolívares o pesos equivalen a un dólar. Se usan para convertir los pagos en esas monedas."
        />
        <div className="grid grid-cols-1 gap-8 p-5 lg:grid-cols-2 lg:gap-6">
          {EXCHANGE_BLOCKS.map((block) => (
            <div key={block.title} className="flex flex-col gap-5 rounded-control border border-borde p-4">
              <p className="text-base font-semibold text-tinta">{block.title}</p>
              <CurrentValueSkeleton label="Vigente, por cada dólar" />
              <RateFieldSkeleton label={block.label} />
              <div className="border-t border-borde pt-4">
                <HistorySkeleton />
              </div>
            </div>
          ))}
        </div>
      </div>
    </SkeletonScreen>
  );
}
