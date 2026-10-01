import { Alert } from "@/components/alert";
import { IconSearch } from "@/components/icons";
import { PANEL_LABEL_CLASS } from "@/components/panel-ui";
import { SkeletonScreen } from "@/components/skeleton";
import { SearchLayout } from "../_shared/search-layout";
import { ButtonSkeleton, InputSkeleton, PageHeaderSkeleton } from "../_shared/skeletons";
import { SearchExamples } from "./search-examples";
import { UsersResultsSkeleton } from "./users-results";

/**
 * Silueta de la base de datos de usuarios: el aviso, el buscador y la tabla.
 * El aviso, la etiqueta, el texto del botón y los ejemplos son fijos y se
 * pintan reales; el campo y el botón llevan el brillo de carga (sin su borde
 * ni su relleno) y los resultados van en barras.
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
        <SearchLayout
          field={<InputSkeleton className="min-w-0 flex-1" />}
          hint={<SearchExamples />}
          actions={
            <ButtonSkeleton className="flex-1 sm:flex-none">
              <IconSearch className="size-5 shrink-0" />
              Buscar
            </ButtonSkeleton>
          }
        />
      </div>
      <UsersResultsSkeleton />
    </SkeletonScreen>
  );
}
