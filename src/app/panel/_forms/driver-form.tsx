import { PanelFeedback } from "@/components/panel-feedback";
import { PANEL_LABEL_CLASS, panelButtonClass, panelInputClass } from "@/components/panel-ui";
import { createDriverAction, updateDriverAction } from "@/app/panel/flota/actions";

/**
 * Formulario reutilizable de alta o edición de un chofer. Mismo patrón que
 * `VehicleForm`: la cédula se muestra completa y de solo lectura al editar.
 */
type DriverFormProps =
  | { mode: "create"; returnTo?: "tablero"; error?: string }
  | {
      mode: "edit";
      driver: { id: string; fullName: string; idNumber: string; phone: string; active: boolean };
      returnTo?: "tablero";
      error?: string;
    };

export function DriverForm(props: DriverFormProps) {
  const isEdit = props.mode === "edit";
  const action = isEdit ? updateDriverAction : createDriverAction;

  return (
    <form action={action} className="flex flex-col gap-4">
      <PanelFeedback error={props.error} />
      {props.returnTo ? <input type="hidden" name="origen" value="tablero" /> : null}
      {isEdit ? <input type="hidden" name="driverId" value={props.driver.id} /> : null}

      <label className={PANEL_LABEL_CLASS}>
        Nombre completo
        <input
          name="fullName"
          required
          defaultValue={isEdit ? props.driver.fullName : undefined}
          className={panelInputClass()}
        />
      </label>

      {isEdit ? (
        <div className={PANEL_LABEL_CLASS}>
          Cédula
          <p className="tabular rounded-lg border border-[var(--color-borde)] bg-[var(--color-fondo)] px-3 py-2 text-sm text-[var(--color-texto-suave)]">
            {props.driver.idNumber}
          </p>
        </div>
      ) : (
        <label className={PANEL_LABEL_CLASS}>
          Cédula
          <input name="idNumber" required className={panelInputClass()} />
        </label>
      )}

      <label className={PANEL_LABEL_CLASS}>
        Teléfono
        <input
          name="phone"
          required
          defaultValue={isEdit ? props.driver.phone : undefined}
          className={panelInputClass()}
        />
      </label>

      {isEdit ? (
        <label className={PANEL_LABEL_CLASS}>
          Estado
          <select
            name="active"
            defaultValue={String(props.driver.active)}
            className={panelInputClass()}
          >
            <option value="true">Activo</option>
            <option value="false">Inactivo</option>
          </select>
        </label>
      ) : null}

      <button type="submit" className={panelButtonClass("primario", "md", "w-fit")}>
        {isEdit ? "Guardar cambios" : "Registrar chofer"}
      </button>
    </form>
  );
}
