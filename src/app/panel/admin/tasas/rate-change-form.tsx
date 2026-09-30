"use client";

import { useId, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { IconAlertCircle } from "@/components/icons";
import { PANEL_LABEL_CLASS, panelButtonClass, panelInputClass } from "@/components/ui-classes";
import { INVALID_AMOUNT_MESSAGE, formatAmount, parseAmount } from "./amount";

export interface RateChangeFormProps {
  /** Acción de servidor que guarda la tasa. */
  action: (formData: FormData) => void | Promise<void>;
  /** Nombre del campo que espera la acción: `amountUsd` o `rateFromUsd`. */
  fieldName: string;
  /** Campos ocultos adicionales, como la moneda. */
  hiddenFields?: Record<string, string>;
  label: string;
  hint: string;
  /** Prefijo de la moneda del monto: "$", "Bs.", "COP". */
  prefix: string;
  /** Qué se cambia, para la pregunta: "la tasa de salida". */
  subject: string;
  /** Unidad tras el monto en la confirmación: " por pasajero", " por cada dólar". */
  unit: string;
  /** Valor vigente ya formateado, o `null` si todavía no hay ninguno. */
  current: string | null;
  /** Botón relleno: solo para la acción principal de la pantalla. Por defecto es de contorno. */
  primary?: boolean;
}

/** Aviso cuando se pulsa "Guardar nueva tasa" con el campo vacío. */
const EMPTY_AMOUNT_MESSAGE = "Escribe el monto nuevo para poder guardarlo.";

/**
 * Campo para escribir una tasa nueva y botón "Guardar nueva tasa". Antes de
 * guardar pide confirmación con el valor anterior y el nuevo, porque el
 * cambio afecta a todas las reservas que se hagan desde ese momento. El campo
 * no lleva ejemplo dentro: se confundía con un valor ya escrito, y el formato
 * ya lo explica la ayuda.
 *
 * El botón nunca queda deshabilitado, para que se alcance con el teclado y el
 * lector de pantalla lea por qué todavía no guarda: sin un monto válido (con
 * la misma regla que aplica el servidor), pulsarlo marca el campo con su
 * error y lo enfoca; con un monto válido abre la confirmación.
 */
export function RateChangeForm({
  action,
  fieldName,
  hiddenFields,
  label,
  hint,
  prefix,
  subject,
  unit,
  current,
  primary = false,
}: RateChangeFormProps) {
  const [value, setValue] = useState("");
  const [touched, setTouched] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const hintId = `${inputId}-ayuda`;
  const errorId = `${inputId}-error`;
  const pendingId = `${inputId}-pendiente`;

  const parsed = parseAmount(value);
  const isEmpty = value.trim() === "";
  const showError = parsed === null && (attempted || (touched && !isEmpty));
  const errorMessage = isEmpty ? EMPTY_AMOUNT_MESSAGE : INVALID_AMOUNT_MESSAGE;
  const next = parsed ? formatAmount(parsed, prefix) : "";
  const triggerClassName = panelButtonClass(primary ? "primario" : "secundario", "md", "w-full sm:w-auto");

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className={PANEL_LABEL_CLASS}>
          {label}
        </label>
        <div className="relative">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-base font-semibold text-tinta-suave"
          >
            {prefix}
          </span>
          <input
            ref={inputRef}
            id={inputId}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onBlur={() => setTouched(true)}
            aria-describedby={showError ? `${hintId} ${errorId}` : hintId}
            aria-invalid={showError ? true : undefined}
            className={panelInputClass(prefix.length >= 3 ? "pl-14" : "pl-9")}
          />
        </div>
        <p id={hintId} className="text-sm leading-snug text-tinta-suave">
          {hint}
        </p>
        <div aria-live="polite">
          {showError ? (
            <p id={errorId} className="flex items-start gap-1.5 text-sm font-semibold leading-snug text-peligro">
              <IconAlertCircle className="mt-px size-4 shrink-0" />
              <span>{errorMessage}</span>
            </p>
          ) : null}
        </div>
      </div>

      <div>
        {parsed === null ? (
          <button
            type="button"
            onClick={() => {
              setAttempted(true);
              inputRef.current?.focus();
            }}
            aria-describedby={showError ? errorId : pendingId}
            className={triggerClassName}
          >
            Guardar nueva tasa
          </button>
        ) : (
          <ConfirmDialog
            triggerLabel="Guardar nueva tasa"
            triggerClassName={triggerClassName}
            title={`¿Cambiar ${subject}?`}
            description={
              <div className="flex flex-col gap-2">
                <p>
                  {current ? (
                    <>
                      Pasará de <strong className="tabular text-tinta">{current}</strong> a{" "}
                      <strong className="tabular text-tinta">{next}</strong>
                      {unit}.
                    </>
                  ) : (
                    <>
                      Quedará en <strong className="tabular text-tinta">{next}</strong>
                      {unit}.
                    </>
                  )}
                </p>
                <p>
                  Aplica a las reservas nuevas desde este momento. Las reservas que ya existen mantienen el precio
                  con el que se hicieron.
                </p>
              </div>
            }
            confirmLabel="Sí, cambiar la tasa"
            pendingLabel="Guardando…"
            action={action}
            fields={{ ...hiddenFields, [fieldName]: parsed }}
          />
        )}
        {parsed === null && !showError ? (
          <p id={pendingId} className="mt-2 text-sm text-tinta-suave">
            {isEmpty ? EMPTY_AMOUNT_MESSAGE : INVALID_AMOUNT_MESSAGE}
          </p>
        ) : null}
      </div>
    </div>
  );
}
