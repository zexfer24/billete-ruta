import { ConfirmDialog } from "@/components/confirm-dialog";
import { panelButtonClass, type PanelButtonSize } from "@/components/panel-ui";
import { SubmitButton } from "@/components/submit-button";
import { formatCount } from "../_shared/format";
import { toggleAgencyAction } from "./actions";

/**
 * Botón para activar o desactivar una agencia. Desactivar pide confirmación
 * con sus consecuencias, porque sus salidas dejan de venderse; activar la
 * devuelve a la venta sin más pasos.
 */
export function AgencyStatusAction({
  agency,
  size = "sm",
  fullWidth = false,
}: {
  agency: { id: string; name: string; active: boolean; routes: number };
  size?: PanelButtonSize;
  fullWidth?: boolean;
}) {
  const width = fullWidth ? "w-full" : undefined;

  if (!agency.active) {
    return (
      <form action={toggleAgencyAction} className={width}>
        <input type="hidden" name="agencyId" value={agency.id} />
        <input type="hidden" name="active" value="true" />
        <SubmitButton pendingLabel="Activando…" className={panelButtonClass("secundario", size, width)}>
          Activar
        </SubmitButton>
      </form>
    );
  }

  return (
    <ConfirmDialog
      triggerLabel="Desactivar"
      triggerClassName={panelButtonClass("secundario", size, width)}
      tone="peligro"
      title={`¿Desactivar ${agency.name}?`}
      description={
        <div className="flex flex-col gap-2">
          <p>
            {agency.routes === 1
              ? "Las salidas de su única ruta dejarán de venderse en la app y en la taquilla."
              : agency.routes > 1
                ? `Las salidas de sus ${formatCount(agency.routes)} rutas dejarán de venderse en la app y en la taquilla.`
                : "Sus salidas dejarán de venderse en la app y en la taquilla."}
          </p>
          <p>Las reservas que ya existen se mantienen. Puedes volver a activarla cuando quieras.</p>
        </div>
      }
      confirmLabel="Sí, desactivar"
      pendingLabel="Desactivando…"
      action={toggleAgencyAction}
      fields={{ agencyId: agency.id, active: "false" }}
    />
  );
}
