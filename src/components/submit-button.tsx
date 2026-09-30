"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { IconSpinner } from "./icons";

export interface SubmitButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  children: ReactNode;
  /** Texto mientras se envía el formulario. */
  pendingLabel?: string;
}

/**
 * Botón de envío de un formulario de servidor (spec 6.1). Mientras la acción
 * corre queda deshabilitado, con un indicador giratorio y `pendingLabel`, así
 * nadie envía dos veces ni se queda sin saber si funcionó. Si el formulario
 * tiene varios botones con `name` y `value`, todos se deshabilitan pero solo
 * el que se pulsó muestra el texto de espera. Las clases las pone quien lo
 * usa (`buttonClass` o `panelButtonClass`).
 */
export function SubmitButton({
  children,
  pendingLabel = "Guardando…",
  className,
  disabled,
  type = "submit",
  name,
  value,
  ...buttonProps
}: SubmitButtonProps) {
  const { pending, data } = useFormStatus();

  // Con varios botones en el mismo formulario, solo el pulsado muestra la espera.
  const isSubmitter = !name || value === undefined || data?.get(name) === String(value);
  const showPending = pending && isSubmitter;

  return (
    <>
      <button
        type={type}
        name={name}
        value={value}
        className={className}
        disabled={disabled || pending}
        aria-disabled={disabled || pending ? true : undefined}
        {...buttonProps}
      >
        {showPending ? (
          <>
            <IconSpinner className="size-5 shrink-0 animate-spin motion-reduce:animate-none" />
            <span>{pendingLabel}</span>
          </>
        ) : (
          children
        )}
      </button>
      {/* Región viva fuera del botón (fuera del flujo por sr-only): anuncia la espera
          aunque el botón pierda el foco al deshabilitarse. */}
      <span className="sr-only" role="status">
        {showPending ? pendingLabel : ""}
      </span>
    </>
  );
}
