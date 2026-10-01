import { IconPlus } from "@/components/icons";
import { SkeletonScreen } from "@/components/skeleton";
import { ButtonSkeleton, PageHeaderSkeleton } from "../_shared/skeletons";
import { AgenciesListSkeleton } from "./agencies-list";

/** Silueta de agencias: el total y la tabla de agencias con su acción. */
export default function AgenciasAdminLoading() {
  return (
    <SkeletonScreen label="Cargando las agencias…" className="flex flex-col gap-6">
      <PageHeaderSkeleton
        title="Agencias del terminal"
        description="Las agencias que venden pasajes en el terminal, con su flota y su personal. Aquí registras una agencia nueva o la desactivas."
        actions={
          <ButtonSkeleton>
            <IconPlus className="size-5 shrink-0" />
            Registrar agencia
          </ButtonSkeleton>
        }
      />
      <AgenciesListSkeleton />
    </SkeletonScreen>
  );
}
