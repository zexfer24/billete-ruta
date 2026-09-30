import { IconPlus } from "@/components/icons";
import { PanelPageHeader, panelButtonClass } from "@/components/panel-ui";
import { SkeletonScreen } from "@/components/skeleton";
import { AgenciesListSkeleton } from "./agencies-list";

/** Silueta de agencias: el total y la tabla de agencias con su acción. */
export default function AgenciasAdminLoading() {
  return (
    <SkeletonScreen label="Cargando las agencias…" className="flex flex-col gap-6">
      <PanelPageHeader
        title="Agencias del terminal"
        description="Las agencias que venden pasajes en el terminal, con su flota y su personal. Aquí registras una agencia nueva o la desactivas."
        actions={
          <span aria-hidden="true" className={panelButtonClass("primario")}>
            <IconPlus className="size-5 shrink-0" />
            Registrar agencia
          </span>
        }
      />
      <AgenciesListSkeleton />
    </SkeletonScreen>
  );
}
