import { PanelPageHeader } from "@/components/panel-ui";
import { Skeleton, SkeletonScreen } from "@/components/skeleton";
import { UsersResultsSkeleton } from "./users-results";

/** Silueta de la base de datos de usuarios: aviso, buscador y tabla. */
export default function UsuariosAdminLoading() {
  return (
    <SkeletonScreen label="Cargando la base de datos de usuarios…" className="flex flex-col gap-6">
      <PanelPageHeader
        title="Base de datos de usuarios"
        description="Las cuentas de pasajero del terminal. Busca a una persona por su cédula, su nombre o su teléfono."
      />
      <Skeleton className="h-20 w-full" />
      <div className="flex flex-col gap-1.5 rounded-tarjeta border border-borde bg-superficie p-4 shadow-1">
        <Skeleton className="h-4 w-64 max-w-full rounded-pastilla" />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-11 min-w-0 flex-1 basis-60" />
          <Skeleton className="h-11 w-full sm:w-28" />
        </div>
        <Skeleton className="h-4 w-80 max-w-full rounded-pastilla" />
      </div>
      <UsersResultsSkeleton />
    </SkeletonScreen>
  );
}
