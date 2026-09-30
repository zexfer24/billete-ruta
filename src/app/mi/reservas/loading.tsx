import { SkeletonScreen } from "@/components/skeleton";
import { SkeletonPageTitle, SkeletonTicketCompact } from "../_components/skeletons";

/** Silueta de Mis viajes: título, control de dos opciones y tres tickets compactos. */
export default function MisReservasLoading() {
  return (
    <SkeletonScreen label="Cargando tus viajes…" className="flex flex-col gap-6">
      <SkeletonPageTitle>Mis viajes</SkeletonPageTitle>
      <div
        aria-hidden="true"
        className="flex gap-1 rounded-pastilla border border-borde bg-superficie p-1 shadow-1"
      >
        {/* Etiquetas fijas sin opción activa: al entrar con ?ver=pasados no destella la equivocada. */}
        {["Próximos", "Pasados"].map((etiqueta) => (
          <span
            key={etiqueta}
            className="flex min-h-11 flex-1 items-center justify-center rounded-pastilla px-4 text-base font-medium text-tinta-suave"
          >
            {etiqueta}
          </span>
        ))}
      </div>
      <div className="flex flex-col gap-4">
        <SkeletonTicketCompact withAction />
        <SkeletonTicketCompact withAction />
        <SkeletonTicketCompact withAction />
      </div>
    </SkeletonScreen>
  );
}
