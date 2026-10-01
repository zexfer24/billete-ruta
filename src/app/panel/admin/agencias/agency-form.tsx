import Link from "next/link";
import { Alert } from "@/components/alert";
import { PANEL_LABEL_CLASS, panelButtonClass, panelInputClass } from "@/components/panel-ui";
import { SubmitButton } from "@/components/submit-button";
import { createAgencyAction } from "./actions";
import { OperatorPasswordField } from "./operator-password-field";

function TextField({
  label,
  name,
  hint,
  type = "text",
  autoComplete,
  minLength,
  inputMode,
}: {
  label: string;
  name: string;
  hint?: string;
  type?: "text" | "email" | "tel";
  autoComplete?: string;
  minLength?: number;
  inputMode?: "text" | "email" | "tel";
}) {
  const hintId = hint ? `${name}-ayuda` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className={PANEL_LABEL_CLASS}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required
        minLength={minLength}
        autoComplete={autoComplete}
        inputMode={inputMode}
        aria-describedby={hintId}
        className={panelInputClass()}
      />
      {hint ? (
        <p id={hintId} className="text-sm leading-snug text-tinta-suave">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Formulario de alta de una agencia con su primer operador, dentro del panel
 * lateral "Registrar agencia". Si el envío falla, el motivo se muestra
 * arriba del formulario.
 */
export function AgencyForm({ error, closeHref }: { error?: string; closeHref: string }) {
  return (
    <form action={createAgencyAction} className="flex flex-col gap-6">
      {error ? (
        <Alert tone="peligro" title="No se pudo registrar la agencia">
          {error}
        </Alert>
      ) : null}

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-3 text-base font-semibold text-tinta">Datos de la agencia</legend>
        <TextField label="Nombre de la agencia" name="name" autoComplete="organization" />
        <TextField label="RIF" name="taxId" hint="Con su letra, por ejemplo J-12345678-9." />
        <TextField
          label="Teléfono de contacto"
          name="contactPhone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          hint="Por ejemplo 0412 123 4567."
        />
        <TextField
          label="Correo de contacto"
          name="contactEmail"
          type="email"
          inputMode="email"
          autoComplete="email"
        />
      </fieldset>

      <div className="border-t border-borde pt-5">
        <fieldset className="flex flex-col gap-4">
          <legend className="mb-3 text-base font-semibold text-tinta">Primer operador</legend>
          <p className="text-sm leading-snug text-tinta-suave">
            Es la persona de la agencia que usará el panel para vender y controlar sus salidas.
          </p>
          <TextField label="Nombre del operador" name="operatorName" autoComplete="off" />
          <TextField
            label="Correo del operador"
            name="operatorEmail"
            type="email"
            inputMode="email"
            autoComplete="off"
            hint="Con este correo entrará al panel."
          />
          <OperatorPasswordField
            label="Contraseña inicial"
            name="operatorPassword"
            hint="Al menos 8 caracteres. Revísala antes de registrar y entrégasela al operador en persona, nunca por mensaje."
          />
        </fieldset>
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-borde pt-5 sm:flex-row sm:justify-end">
        <Link href={closeHref} scroll={false} className={panelButtonClass("secundario", "lg", "w-full sm:w-auto")}>
          Cancelar
        </Link>
        <SubmitButton pendingLabel="Registrando…" className={panelButtonClass("primario", "lg", "w-full sm:w-auto")}>
          Registrar agencia
        </SubmitButton>
      </div>
    </form>
  );
}
