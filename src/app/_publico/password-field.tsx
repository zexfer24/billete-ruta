"use client";

import { useState, type InputHTMLAttributes } from "react";
import { IconEye } from "@/components/icons";
import { FieldError, FieldHint } from "@/components/ui";
import { fieldControlClass } from "@/components/ui-classes";

interface PasswordFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "name" | "type" | "className"> {
  label: string;
  name: string;
  hint?: string;
  error?: string;
  /** El error viene del envío del formulario: se anuncia con `role="alert"`. */
  errorAfterSubmit?: boolean;
  id?: string;
}

/**
 * Campo de contraseña con el mismo aspecto que `Field` y un botón con texto
 * para mostrarla u ocultarla: en el teléfono es fácil equivocarse al escribir
 * sin ver. El botón cabe dentro del campo y mide 44 px de alto.
 */
export function PasswordField({ label, name, hint, error, errorAfterSubmit, id, ...inputProps }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const fieldId = id ?? name;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={fieldId} className="text-sm font-semibold text-tinta">
        {label}
      </label>
      <div className="relative">
        <input
          id={fieldId}
          name={name}
          type={visible ? "text" : "password"}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          className={fieldControlClass(Boolean(error), "pr-28")}
          {...inputProps}
        />
        <button
          type="button"
          onClick={() => setVisible((actual) => !actual)}
          aria-controls={fieldId}
          className="foco absolute right-0.5 top-1/2 inline-flex min-h-11 -translate-y-1/2 cursor-pointer items-center gap-1.5 rounded-control px-3 text-sm font-semibold text-marca-700 transition-colors duration-150 ease-out hover:bg-marca-50 motion-reduce:transition-none"
        >
          <IconEye aria-hidden="true" className="size-5" />
          {visible ? "Ocultar" : "Mostrar"}
          <span className="sr-only"> contraseña</span>
        </button>
      </div>
      {hintId ? <FieldHint id={hintId}>{hint}</FieldHint> : null}
      <div aria-live="polite">
        {errorId ? (
          <FieldError id={errorId} afterSubmit={errorAfterSubmit}>
            {error}
          </FieldError>
        ) : null}
      </div>
    </div>
  );
}
