import { Alert } from "@/components/alert";
import { IconSearch } from "@/components/icons";
import { PANEL_LABEL_CLASS, panelButtonClass } from "@/components/panel-ui";
import { SkeletonScreen } from "@/components/skeleton";
import { InputSkeleton, PageHeaderSkeleton } from "../_shared/skeletons";
import { SearchExamples } from "./search-examples";
import { UsersResultsSkeleton } from "./users-results";

/**
 * Silueta de la base de datos de usuarios: el aviso, el buscador y la tabla.
 * El aviso, la etiqueta, el botón y los ejemplos son textos fijos y se pintan
 * reales; el campo va vacío con su borde y solo los resultados van en barras.
 */
export default function UsuariosAdminLoading() {
  return (
    <SkeletonScreen label="Cargando la base de datos de usuarios…" className="flex flex-col gap-6">
      <PageHeaderSkeleton
        title="Base de datos de usuarios"
        description="Las cuentas de pasajero del terminal. Busca a una persona por su cédula, su nombre o su teléfono."
      />
      <div aria-hidden="true">
        <Alert tone="alerta" role="none" title="Datos personales">
          Aquí ves la cédula completa y el teléfono de cada pasajero. Cada consulta queda registrada con tu nombre.
        </Alert>
      </div>
      <div
        aria-hidden="true"
        className="flex flex-col gap-1.5 rounded-tarjeta border border-borde bg-superficie p-4 shadow-1"
      >
        <p className={PANEL_LABEL_CLASS}>Buscar por cédula, nombre o teléfono</p>
        <div className="flex flex-wrap gap-2">
          <InputSkeleton className="min-w-0 flex-1 basis-60" />
          <span className={panelButtonClass("primario", "md", "flex-1 sm:flex-none")}>
            <IconSearch className="size-5 shrink-0" />
            Buscar
          </span>
        </div>
        <SearchExamples />
      </div>
      <UsersResultsSkeleton />
    </SkeletonScreen>
  );
}
