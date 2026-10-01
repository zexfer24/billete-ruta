import { ConfirmDialog } from "@/components/confirm-dialog";
import { panelButtonClass, type PanelButtonSize } from "@/components/panel-ui";
import { SubmitButton } from "@/components/submit-button";
import { formatCount } from "../_shared/format";
import { toggleAgencyAction } from "./actions";

/**
 * Qué pasa con la gente que ya compró: la cifra de reservas de viajes
 * próximos y que el personal sigue entrando al panel (desactivar la agencia
 * no corta su acceso), para que quien decide sepa que no deja a nadie sin
 * atender.
 */
function upcomingReservationsText(count: number): string {
  if (count === 0) return "No tiene reservas de viajes próximos.";
  if (count === 1) {
    return "Su única reserva de un viaje próximo se mantiene y su personal puede seguir entrando al panel para cobrarla y embarcarla.";
  }
  return `Sus ${formatCount(count)} reservas de viajes próximos se mantienen y su personal puede seguir entrando al panel para cobrarlas y embarcarlas.`;
}

/**
 * Botón para activar o desactivar una agencia. Desactivar pide confirmación
 * con sus consecuencias en números, porque sus salidas dejan de venderse;
 * activar la devuelve a la venta sin más pasos.
 */
export function AgencyStatusAction({
  agency,
  size = "sm",
  fullWidth = false,
}: {
  agency: {
    id: string;
    name: string;
    active: boolean;
    routes: number;
    /** Reservas que ocupan puesto en salidas futuras de la agencia. */
    upcomingReservations: number;
  };
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
          <p>{upcomingReservationsText(agency.upcomingReservations)}</p>
          <p>Puedes volver a activarla cuando quieras.</p>
        </div>
      }
      confirmLabel="Sí, desactivar"
      pendingLabel="Desactivando…"
      action={toggleAgencyAction}
      fields={{ agencyId: agency.id, active: "false" }}
    />
  );
}
