import { PanelFeedback } from "@/components/panel-feedback";
import { SubmitButton } from "@/components/submit-button";
import { Alert } from "@/components/alert";
import { panelButtonClass, panelInputClass } from "@/components/panel-ui";
import { createDriverAction, updateDriverAction } from "@/app/panel/flota/actions";
import { PanelField, PanelFixedValue, errorFieldFor, panelFieldAria } from "./panel-field";
import { upcomingTitle } from "./upcoming-title";
import { UnitStatusChoice } from "./unit-status-choice";

const AYUDA_NOMBRE = "Nombres y apellidos, como aparecen en la cédula.";

/** Campos del formulario, para ubicar el error de `?campo=`. */
const CAMPOS = ["fullName", "idNumber", "phone", "active"] as const;

/**
 * Formulario reutilizable de alta o edición de un chofer. Mismo patrón que
 * `VehicleForm`: la cédula se muestra completa y fija al editar, porque
 * identifica al chofer.
 */
type DriverFormProps =
  | { mode: "create"; returnTo?: "tablero"; error?: string; errorField?: string }
  | {
      mode: "edit";
      driver: { id: string; fullName: string; idNumber: string; phone: string; active: boolean };
      /** Salidas próximas que tiene asignadas, para advertir antes de ponerlo fuera de servicio. */
      upcomingCount?: number;
      returnTo?: "tablero";
      error?: string;
      errorField?: string;
    };

export function DriverForm(props: DriverFormProps) {
  const isEdit = props.mode === "edit";
  const action = isEdit ? updateDriverAction : createDriverAction;
  const campoConError = errorFieldFor(props.error, props.errorField, CAMPOS);
  const errorDe = (campo: (typeof CAMPOS)[number]) => (campoConError === campo ? props.error : undefined);

  const ayudaCedula = "Con la letra delante (V, E o P) y sin puntos. Por ejemplo, V12345678.";
  const ayudaTelefono = "Con el código de área. Por ejemplo, 0414 1234567.";

  return (
    <form action={action} className="flex flex-col gap-5">
      <PanelFeedback error={props.error} />
      {props.returnTo ? <input type="hidden" name="origen" value="tablero" /> : null}
      {isEdit ? <input type="hidden" name="driverId" value={props.driver.id} /> : null}

      {/* Sin placeholder: el ejemplo va en la ayuda, como en los demás campos,
          para que el campo vacío no parezca ya lleno. */}
      <PanelField id="chofer-nombre" label="Nombre completo" hint={AYUDA_NOMBRE} error={errorDe("fullName")}>
        <input
          name="fullName"
          required
          autoComplete="off"
          defaultValue={isEdit ? props.driver.fullName : undefined}
          className={panelInputClass()}
          {...panelFieldAria("chofer-nombre", AYUDA_NOMBRE, errorDe("fullName"))}
        />
      </PanelField>

      {isEdit ? (
        <PanelFixedValue
          label="Cédula"
          value={props.driver.idNumber}
          hint="La cédula no se puede cambiar. Si es otra persona, regístrala como un chofer nuevo."
        />
      ) : (
        <PanelField id="chofer-cedula" label="Cédula" hint={ayudaCedula} error={errorDe("idNumber")}>
          <input
            name="idNumber"
            required
            maxLength={15}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            className={panelInputClass("tabular uppercase")}
            {...panelFieldAria("chofer-cedula", ayudaCedula, errorDe("idNumber"))}
          />
        </PanelField>
      )}

      <PanelField id="chofer-telefono" label="Teléfono" hint={ayudaTelefono} error={errorDe("phone")}>
        <input
          name="phone"
          type="tel"
          inputMode="tel"
          required
          autoComplete="off"
          defaultValue={isEdit ? props.driver.phone : undefined}
          className={panelInputClass("tabular")}
          {...panelFieldAria("chofer-telefono", ayudaTelefono, errorDe("phone"))}
        />
      </PanelField>

      {isEdit ? (
        <>
          <UnitStatusChoice
            name="active"
            defaultActive={props.driver.active}
            activeLabel="Disponible para manejar"
            activeHint="Aparece al crear salidas nuevas."
            inactiveHint="No aparece al crear salidas nuevas, por ejemplo mientras está de vacaciones."
            error={errorDe("active")}
          />
          {props.upcomingCount && props.upcomingCount > 0 ? (
            <Alert tone="info" role="none" title={upcomingTitle(props.upcomingCount)}>
              Si lo pones fuera de servicio, esas salidas no cambian: siguen con este chofer.
            </Alert>
          ) : null}
        </>
      ) : null}

      <SubmitButton
        pendingLabel={isEdit ? "Guardando cambios…" : "Registrando chofer…"}
        className={panelButtonClass("primario", "lg", "w-full sm:w-fit")}
      >
        {isEdit ? "Guardar cambios" : "Registrar chofer"}
      </SubmitButton>
    </form>
  );
}
