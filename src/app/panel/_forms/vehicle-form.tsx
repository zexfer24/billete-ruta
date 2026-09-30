import { PanelFeedback } from "@/components/panel-feedback";
import { SubmitButton } from "@/components/submit-button";
import { Alert } from "@/components/alert";
import { panelButtonClass, panelInputClass } from "@/components/panel-ui";
import { createVehicleAction, updateVehicleAction } from "@/app/panel/flota/actions";
import { PanelField, PanelFixedValue, errorFieldFor, panelFieldAria } from "./panel-field";
import { UnitStatusChoice, upcomingTitle } from "./unit-status-choice";

/** Campos del formulario, para ubicar el error de `?campo=`. */
const CAMPOS = ["plate", "brand", "model", "seatCount", "active"] as const;

/**
 * Formulario reutilizable de alta o edición de un vehículo. Lo usa el panel
 * de flota y, con `returnTo="tablero"`, el registro rápido del tablero.
 */
type VehicleFormProps =
  | { mode: "create"; returnTo?: "tablero"; error?: string; errorField?: string }
  | {
      mode: "edit";
      vehicle: { id: string; plate: string; brand: string; model: string; seatCount: number; active: boolean };
      /** Salidas próximas que tiene asignadas, para advertir antes de ponerlo fuera de servicio. */
      upcomingCount?: number;
      returnTo?: "tablero";
      error?: string;
      errorField?: string;
    };

export function VehicleForm(props: VehicleFormProps) {
  const isEdit = props.mode === "edit";
  const action = isEdit ? updateVehicleAction : createVehicleAction;
  const campoConError = errorFieldFor(props.error, props.errorField, CAMPOS);
  const errorDe = (campo: (typeof CAMPOS)[number]) => (campoConError === campo ? props.error : undefined);

  const ayudaPlaca = "Entre 5 y 10 letras y números. Puedes escribirla con o sin guiones.";
  const ayudaPuestos = "Solo los puestos para pasajeros, sin contar al chofer. Entre 4 y 80.";

  return (
    <form action={action} className="flex flex-col gap-5">
      <PanelFeedback error={props.error} />
      {props.returnTo ? <input type="hidden" name="origen" value="tablero" /> : null}
      {isEdit ? <input type="hidden" name="vehicleId" value={props.vehicle.id} /> : null}

      {isEdit ? (
        <PanelFixedValue
          label="Placa"
          value={props.vehicle.plate}
          hint="La placa no se puede cambiar. Si es otro vehículo, regístralo como nuevo."
        />
      ) : (
        <PanelField id="vehiculo-placa" label="Placa" hint={ayudaPlaca} error={errorDe("plate")}>
          <input
            name="plate"
            required
            maxLength={12}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="AB123CD"
            className={panelInputClass("tabular uppercase")}
            {...panelFieldAria("vehiculo-placa", ayudaPlaca, errorDe("plate"))}
          />
        </PanelField>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <PanelField id="vehiculo-marca" label="Marca" error={errorDe("brand")}>
          <input
            name="brand"
            required
            autoComplete="off"
            placeholder="Encava"
            defaultValue={isEdit ? props.vehicle.brand : undefined}
            className={panelInputClass()}
            {...panelFieldAria("vehiculo-marca", undefined, errorDe("brand"))}
          />
        </PanelField>

        <PanelField id="vehiculo-modelo" label="Modelo" error={errorDe("model")}>
          <input
            name="model"
            required
            autoComplete="off"
            placeholder="ENT-610"
            defaultValue={isEdit ? props.vehicle.model : undefined}
            className={panelInputClass()}
            {...panelFieldAria("vehiculo-modelo", undefined, errorDe("model"))}
          />
        </PanelField>
      </div>

      <PanelField id="vehiculo-puestos" label="Puestos para pasajeros" hint={ayudaPuestos} error={errorDe("seatCount")}>
        <input
          name="seatCount"
          type="number"
          inputMode="numeric"
          min={4}
          max={80}
          step={1}
          required
          defaultValue={isEdit ? props.vehicle.seatCount : undefined}
          className={panelInputClass("tabular w-32")}
          {...panelFieldAria("vehiculo-puestos", ayudaPuestos, errorDe("seatCount"))}
        />
      </PanelField>

      {isEdit ? (
        <>
          <UnitStatusChoice
            name="active"
            defaultActive={props.vehicle.active}
            activeLabel="Disponible para asignar salidas"
            activeHint="Aparece al crear salidas nuevas."
            inactiveHint="No aparece al crear salidas nuevas, por ejemplo mientras está en el taller."
            error={errorDe("active")}
          />
          {props.upcomingCount && props.upcomingCount > 0 ? (
            <Alert tone="info" role="none" title={upcomingTitle(props.upcomingCount)}>
              Si lo pones fuera de servicio, esas salidas no cambian: siguen con este vehículo.
            </Alert>
          ) : null}
        </>
      ) : null}

      <SubmitButton
        pendingLabel={isEdit ? "Guardando cambios…" : "Registrando vehículo…"}
        className={panelButtonClass("primario", "lg", "w-full sm:w-fit")}
      >
        {isEdit ? "Guardar cambios" : "Registrar vehículo"}
      </SubmitButton>
    </form>
  );
}
