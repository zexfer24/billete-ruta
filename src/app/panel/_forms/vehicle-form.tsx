import { PanelFeedback } from "@/components/panel-feedback";
import { PANEL_LABEL_CLASS, panelButtonClass, panelInputClass } from "@/components/panel-ui";
import { createVehicleAction, updateVehicleAction } from "@/app/panel/flota/actions";

/**
 * Formulario reutilizable de alta o edición de un vehículo. Lo usa el panel
 * de flota y, con `returnTo="tablero"`, el registro rápido del tablero.
 */
type VehicleFormProps =
  | { mode: "create"; returnTo?: "tablero"; error?: string }
  | {
      mode: "edit";
      vehicle: { id: string; plate: string; brand: string; model: string; seatCount: number; active: boolean };
      returnTo?: "tablero";
      error?: string;
    };

export function VehicleForm(props: VehicleFormProps) {
  const isEdit = props.mode === "edit";
  const action = isEdit ? updateVehicleAction : createVehicleAction;

  return (
    <form action={action} className="flex flex-col gap-4">
      <PanelFeedback error={props.error} />
      {props.returnTo ? <input type="hidden" name="origen" value="tablero" /> : null}
      {isEdit ? <input type="hidden" name="vehicleId" value={props.vehicle.id} /> : null}

      {isEdit ? (
        <div className={PANEL_LABEL_CLASS}>
          Placa
          <p className="tabular rounded-lg border border-[var(--color-borde)] bg-[var(--color-fondo)] px-3 py-2 text-sm text-[var(--color-texto-suave)]">
            {props.vehicle.plate}
          </p>
        </div>
      ) : (
        <label className={PANEL_LABEL_CLASS}>
          Placa
          <input name="plate" required className={panelInputClass()} />
        </label>
      )}

      <label className={PANEL_LABEL_CLASS}>
        Marca
        <input
          name="brand"
          required
          defaultValue={isEdit ? props.vehicle.brand : undefined}
          className={panelInputClass()}
        />
      </label>

      <label className={PANEL_LABEL_CLASS}>
        Modelo
        <input
          name="model"
          required
          defaultValue={isEdit ? props.vehicle.model : undefined}
          className={panelInputClass()}
        />
      </label>

      <label className={PANEL_LABEL_CLASS}>
        N° de asientos
        <input
          name="seatCount"
          type="number"
          min={4}
          max={80}
          required
          defaultValue={isEdit ? props.vehicle.seatCount : undefined}
          className={panelInputClass("w-24")}
        />
      </label>

      {isEdit ? (
        <label className={PANEL_LABEL_CLASS}>
          Estado
          <select
            name="active"
            defaultValue={String(props.vehicle.active)}
            className={panelInputClass()}
          >
            <option value="true">Activo</option>
            <option value="false">Inactivo</option>
          </select>
        </label>
      ) : null}

      <button type="submit" className={panelButtonClass("primario", "md", "w-fit")}>
        {isEdit ? "Guardar cambios" : "Registrar vehículo"}
      </button>
    </form>
  );
}
