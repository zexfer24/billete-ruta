"use client";

import type { ButtonHTMLAttributes, MouseEvent, ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { IconSpinner } from "./icons";

export interface SubmitButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  children: ReactNode;
  /** Texto mientras se envía el formulario. */
  pendingLabel?: string;
}

/**
 * Botón de envío de un formulario de servidor (spec 6.1). Mientras la acción
 * corre bloquea el reenvío y queda marcado con `aria-disabled`, con un
 * indicador giratorio y `pendingLabel`, así nadie envía dos veces ni se queda
 * sin saber si funcionó. No usa el `disabled` nativo durante la espera: un
 * botón deshabilitado pierde el foco y quien usa teclado o lector de pantalla
 * volvería a empezar desde arriba de la página. El clic (y el Enter, que
 * dispara un clic en el botón por defecto) se cancela mientras envía. La prop
 * `disabled` sí deshabilita de verdad. Si el formulario tiene varios botones
 * con `name` y `value`, todos se bloquean pero solo el que se pulsó muestra
 * el texto de espera. Las clases las pone quien lo usa (`buttonClass` o
 * `panelButtonClass`), que ya atenúan `aria-disabled`.
 */
export function SubmitButton({
  children,
  pendingLabel = "Guardando…",
  className,
  disabled,
  type = "submit",
  name,
  value,
  onClick,
  ...buttonProps
}: SubmitButtonProps) {
  const { pending, data } = useFormStatus();

  // Con varios botones en el mismo formulario, solo el pulsado muestra la espera.
  const isSubmitter = !name || value === undefined || data?.get(name) === String(value);
  const showPending = pending && isSubmitter;

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    if (pending) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  }

  return (
    <>
      <button
        type={type}
        name={name}
        value={value}
        className={className}
        {...buttonProps}
        disabled={disabled}
        aria-disabled={disabled || pending ? true : undefined}
        onClick={handleClick}
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
          aunque el lector de pantalla no vuelva a leer el botón. */}
      <span className="sr-only" role="status">
        {showPending ? pendingLabel : ""}
      </span>
    </>
  );
}
