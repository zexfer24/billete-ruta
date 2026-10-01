import { PANEL_LABEL_CLASS } from "@/components/panel-ui";
import { Skeleton, SkeletonScreen } from "@/components/skeleton";
import { ButtonSkeleton, InputSkeleton, PageHeaderSkeleton } from "../_shared/skeletons";
import { PAGE_DESCRIPTION, PAGE_TITLE, RATE_SECTIONS, amountHint } from "./texts";

const CARD = "rounded-tarjeta border border-borde bg-superficie shadow-1";

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

/** Campo de la tasa nueva con su etiqueta y su ayuda reales; el campo y el botón, con el brillo de carga. */
function RateFieldSkeleton({ label, example }: { label: string; example: string }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <p className={PANEL_LABEL_CLASS}>{label}</p>
        <InputSkeleton />
        <p className="text-sm leading-snug text-tinta-suave">{amountHint(example)}</p>
      </div>
      <div>
        <ButtonSkeleton className="w-full sm:w-auto">Guardar nueva tasa</ButtonSkeleton>
      </div>
    </div>
  );
}

/** Historial con su título real; la tasa de salida suele tener varios cambios y las de cambio, uno. */
function HistorySkeleton({ rows }: { rows: number }) {
  if (rows <= 1) {
    // Una tasa sin cambios anteriores lo dice en una sola línea.
    return (
      <div className="flex items-center gap-2">
        <p className="text-sm font-semibold text-tinta-suave">Historial:</p>
        <Skeleton className="h-4 w-40 rounded-pastilla" />
      </div>
    );
  }
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

/** Las tres tarjetas, en el orden de la página; la tasa de salida suele tener varios cambios. */
const SECTIONS = [
  { ...RATE_SECTIONS.tax, historyRows: 3 },
  { ...RATE_SECTIONS.VES, historyRows: 1 },
  { ...RATE_SECTIONS.COP, historyRows: 1 },
] as const;

/**
 * Silueta de tasas: las tres tarjetas hermanas (tasa de salida, bolívar y
 * peso colombiano) con la misma disposición que la página. Los títulos, las
 * etiquetas, la ayuda y el texto de los botones se pintan reales; los campos
 * y los botones llevan el brillo de carga, y los montos y las fechas van en
 * barras.
 */
export default function TasasAdminLoading() {
  return (
    <SkeletonScreen label="Cargando las tasas…" className="flex flex-col gap-6">
      <PageHeaderSkeleton title={PAGE_TITLE} description={PAGE_DESCRIPTION} />

      {SECTIONS.map((section) => (
        <div key={section.title} aria-hidden="true" className={CARD}>
          <SectionHeader title={section.title} description={section.description} />
          <div className="p-5">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <CurrentValueSkeleton label={section.currentLabel} />
              <RateFieldSkeleton label={section.fieldLabel} example={section.example} />
            </div>
            <div className="mt-6 border-t border-borde pt-4">
              <HistorySkeleton rows={section.historyRows} />
            </div>
          </div>
        </div>
      ))}
    </SkeletonScreen>
  );
}
