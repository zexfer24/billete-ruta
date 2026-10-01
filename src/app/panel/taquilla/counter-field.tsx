import type { InputHTMLAttributes } from "react";
import { FieldErrorSlot, FieldHint } from "@/components/ui";
import { panelInputClass } from "@/components/panel-ui";
import { cx } from "@/components/ui-classes";

/**
 * Campo de texto de la taquilla: etiqueta visible, control del panel de 48 px
 * (más cómodo en el mostrador), ayuda y error debajo, unidos al control con
 * `aria-describedby`. Sin estado: lo usan los pasos del asistente, que son
 * componentes de cliente.
 */
export function CounterField({
  id,
  label,
  hint,
  error,
  errorAfterSubmit,
  className,
  inputClassName,
  ...inputProps
}: Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "className"> & {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  /** El error llega por una acción de la persona (buscar, continuar): se anuncia con `role="alert"`. */
  errorAfterSubmit?: boolean;
  className?: string;
  inputClassName?: string;
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cx("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-semibold text-tinta">
        {label}
      </label>
      <input
        id={id}
        type="text"
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
        className={panelInputClass(cx("min-h-12", inputClassName))}
        {...inputProps}
      />
      {hintId ? <FieldHint id={hintId}>{hint}</FieldHint> : null}
      {/* Mismo contrato que `Field`: el error tras una acción va con `role="alert"`
          fuera de la región viva, así el lector no lo anuncia dos veces. */}
      <FieldErrorSlot id={`${id}-error`} error={error} afterSubmit={errorAfterSubmit} />
    </div>
  );
}
