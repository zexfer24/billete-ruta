"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type InputHTMLAttributes } from "react";
import { IconAlertCircle, IconCamera, IconCheckCircle, IconDocument, IconUpload } from "./icons";
import { cx, formatFileSize } from "./ui-classes";

export interface FileFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "name" | "type" | "className" | "capture"> {
  label: string;
  name: string;
  hint?: string;
  error?: string;
  /** El error viene del envío del formulario: se anuncia con `role="alert"`. */
  errorAfterSubmit?: boolean;
  /** `"environment"` abre la cámara trasera del teléfono; `"user"`, la frontal. */
  capture?: "environment" | "user";
  /** Tamaño máximo en MB. Un archivo más pesado no deja enviar el formulario y explica por qué. */
  maxSizeMb?: number;
  /** Texto del botón antes de elegir, por ejemplo "Tomar o elegir la foto". */
  buttonLabel?: string;
  /** Línea bajo el botón mientras no hay archivo; por defecto dice "foto" o "archivo" según `accept`. */
  emptyLabel?: string;
  id?: string;
  className?: string;
}

const ERROR_CLASS = "flex items-start gap-1.5 text-sm font-semibold leading-snug text-peligro";

interface ChosenFile {
  name: string;
  size: number;
  previewUrl: string | null;
}

/** El campo solo acepta imágenes (o abre la cámara): se le habla de "foto". */
function acceptsOnlyImages(accept: string | undefined, capture: FileFieldProps["capture"]): boolean {
  if (capture) return true;
  if (!accept) return false;
  const types = accept.split(",").map((type) => type.trim()).filter(Boolean);
  return types.length > 0 && types.every((type) => type.startsWith("image/"));
}

/** Primer control del formulario que no pasa la validación nativa. */
function firstInvalidControl(form: HTMLFormElement): Element | undefined {
  return Array.from(form.elements).find(
    (element) =>
      (element instanceof HTMLInputElement ||
        element instanceof HTMLSelectElement ||
        element instanceof HTMLTextAreaElement) &&
      element.willValidate &&
      !element.validity.valid,
  );
}

/**
 * Campo para subir un archivo con la apariencia de `Field`: etiqueta visible,
 * una zona grande que abre el selector (o la cámara con `capture`), el nombre
 * y el peso del archivo elegido y una vista previa si es una imagen. El
 * control nativo sigue siendo el que recibe el foco y el teclado. Se limpia
 * solo cuando el formulario se reinicia tras un envío correcto. Si es
 * obligatorio y se envía vacío, en vez de la burbuja nativa del navegador
 * (que saldría pegada al control oculto) muestra su propio error bajo la zona.
 */
export function FileField({
  label,
  name,
  hint,
  error,
  errorAfterSubmit,
  capture,
  maxSizeMb,
  buttonLabel,
  emptyLabel,
  id,
  className,
  onChange,
  onInvalid,
  ...inputProps
}: FileFieldProps) {
  const fieldId = id ?? name;
  const labelId = `${fieldId}-label`;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = `${fieldId}-error`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [chosen, setChosen] = useState<ChosenFile | null>(null);
  const [sizeError, setSizeError] = useState<string | null>(null);
  // Error propio de "falta el archivo", en lugar de la burbuja nativa.
  const [missingError, setMissingError] = useState<string | null>(null);
  // El error que vino del servidor deja de mostrarse en cuanto se elige otro archivo.
  const [touched, setTouched] = useState(false);

  const isPhoto = acceptsOnlyImages(inputProps.accept, capture);
  const shownError = sizeError ?? missingError ?? (touched ? null : error) ?? null;
  // El error de peso aparece al elegir (región cortés); los demás llegan al enviar.
  const errorIsAlert = !sizeError && (Boolean(missingError) || Boolean(errorAfterSubmit));
  const describedBy = [hintId, shownError ? errorId : undefined].filter(Boolean).join(" ") || undefined;

  // Libera la URL de la vista previa al cambiar de archivo o al desmontar.
  useEffect(() => {
    const url = chosen?.previewUrl;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [chosen?.previewUrl]);

  // React reinicia el formulario tras una acción exitosa: el campo vuelve a quedar vacío.
  useEffect(() => {
    const form = inputRef.current?.form;
    if (!form) return;
    function handleReset() {
      setChosen(null);
      setSizeError(null);
      setMissingError(null);
      setTouched(false);
      inputRef.current?.setCustomValidity("");
    }
    form.addEventListener("reset", handleReset);
    return () => form.removeEventListener("reset", handleReset);
  }, []);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    setTouched(true);
    setMissingError(null);

    if (!file) {
      setChosen(null);
      setSizeError(null);
      input.setCustomValidity("");
    } else {
      const tooBig = maxSizeMb !== undefined && file.size > maxSizeMb * 1024 * 1024;
      const message = tooBig
        ? `El archivo pesa ${formatFileSize(file.size)}. El máximo es ${maxSizeMb} MB: elige uno más liviano.`
        : null;
      input.setCustomValidity(message ?? "");
      setSizeError(message);
      setChosen({
        name: file.name,
        size: file.size,
        previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
      });
    }

    onChange?.(event);
  }

  function handleInvalid(event: FormEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    // Sin burbuja nativa: el error se muestra bajo la zona que la persona ve.
    event.preventDefault();
    if (input.validity.valueMissing) {
      setMissingError(isPhoto ? "Elige la foto antes de enviar." : "Elige el archivo antes de enviar.");
    }
    // Solo toma el foco si es el primer campo con problemas del formulario.
    const form = input.form;
    if (!form || firstInvalidControl(form) === input) input.focus();
    onInvalid?.(event);
  }

  const idleLabel = buttonLabel ?? (capture ? "Tomar o elegir una foto" : "Elegir un archivo");
  const IdleIcon = capture ? IconCamera : IconUpload;

  return (
    <div className={cx("flex flex-col gap-1.5", className)}>
      <span id={labelId} className="text-sm font-semibold text-tinta">
        {label}
      </span>

      {/* El control nativo va primero (oculto a la vista) para que la zona reaccione a su foco. */}
      <input
        ref={inputRef}
        id={fieldId}
        name={name}
        type="file"
        capture={capture}
        aria-labelledby={labelId}
        aria-describedby={describedBy}
        aria-invalid={shownError ? true : undefined}
        className="peer sr-only"
        onChange={handleChange}
        onInvalid={handleInvalid}
        {...inputProps}
      />
      <label
        htmlFor={fieldId}
        className={cx(
          "flex min-h-14 cursor-pointer items-center gap-3 rounded-control border-2 border-dashed bg-superficie px-4 py-3 transition-colors duration-150 ease-out motion-reduce:transition-none",
          "hover:border-marca-600 hover:bg-marca-50",
          "peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-marca-600",
          "peer-disabled:cursor-not-allowed peer-disabled:opacity-60",
          shownError ? "border-peligro" : chosen ? "border-marca-600" : "border-borde-control",
        )}
      >
        {chosen?.previewUrl ? (
          // Vista previa local (blob:), por eso no usa next/image.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={chosen.previewUrl}
            alt=""
            className="size-16 shrink-0 rounded-control border border-borde object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className="grid size-12 shrink-0 place-items-center rounded-full bg-marca-50 text-marca-600"
          >
            {chosen ? <IconDocument className="size-6" /> : <IdleIcon className="size-6" />}
          </span>
        )}
        <span className="flex min-w-0 flex-1 flex-col">
          {chosen ? (
            <>
              <span className="flex items-center gap-1.5 text-sm font-semibold text-exito">
                <IconCheckCircle className="size-4 shrink-0" />
                Archivo elegido
              </span>
              <span className="truncate text-base font-medium text-tinta">{chosen.name}</span>
              <span className="tabular text-sm text-tinta-suave">
                {formatFileSize(chosen.size)} · Puedes elegir otro para cambiarlo
              </span>
            </>
          ) : (
            <>
              <span className="text-base font-semibold text-marca-700">{idleLabel}</span>
              <span className="text-sm text-tinta-suave">
                {emptyLabel ?? (isPhoto ? "Aún no has elegido ninguna foto" : "Aún no has elegido ningún archivo")}
              </span>
            </>
          )}
        </span>
      </label>

      {hint ? (
        <p id={hintId} className="text-sm leading-snug text-tinta-suave">
          {hint}
        </p>
      ) : null}
      {/* Una sola región viva por mensaje: el error tras enviar va como alerta
          fuera de la región cortés, nunca anidado dentro de ella. */}
      {shownError && errorIsAlert ? (
        <p id={errorId} role="alert" className={ERROR_CLASS}>
          <IconAlertCircle className="mt-px size-4 shrink-0" />
          <span>{shownError}</span>
        </p>
      ) : null}
      <div aria-live="polite">
        {shownError && !errorIsAlert ? (
          <p id={errorId} className={ERROR_CLASS}>
            <IconAlertCircle className="mt-px size-4 shrink-0" />
            <span>{shownError}</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}
