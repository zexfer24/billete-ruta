"use client";

import { useEffect, useId, useRef, type ReactNode, type RefObject } from "react";
import { useFormStatus } from "react-dom";
import { IconInfo, IconWarning } from "./icons";
import { SubmitButton } from "./submit-button";
import { cx, panelButtonClass } from "./ui-classes";

export type ConfirmDialogTone = "normal" | "peligro";

export interface ConfirmDialogProps {
  /** Texto del botón que abre la confirmación. */
  triggerLabel: ReactNode;
  triggerClassName?: string;
  /** Pregunta clara, por ejemplo "¿Registrar la salida del bus?". */
  title: string;
  /** Consecuencias en números: "Se anularán 3 reservas sin abordar". */
  description: ReactNode;
  confirmLabel: string;
  confirmClassName?: string;
  /** Texto del botón de confirmar mientras se envía. */
  pendingLabel?: string;
  cancelLabel?: string;
  /** Acción de servidor que recibe el formulario con `fields`. */
  action: (formData: FormData) => void | Promise<void>;
  /** Campos ocultos del formulario (id de la salida, de la agencia…). */
  fields?: Record<string, string>;
  /** `peligro` pinta el botón de confirmar en rojo y muestra un icono de advertencia. */
  tone?: ConfirmDialogTone;
  /** Deshabilita el botón que abre la confirmación. */
  disabled?: boolean;
}

/**
 * Sigue el envío del formulario: guarda en `pendingRef` si la acción está en
 * curso (el `<dialog>` la consulta para no cerrarse con Escape ni con un clic
 * en el fondo) y cierra el diálogo cuando termina (pasó de pendiente a listo).
 */
function FormPendingWatcher({
  pendingRef,
  onDone,
}: {
  pendingRef: RefObject<boolean>;
  onDone: () => void;
}) {
  const { pending } = useFormStatus();
  const wasPending = useRef(false);

  useEffect(() => {
    pendingRef.current = pending;
    if (wasPending.current && !pending) onDone();
    wasPending.current = pending;
  }, [pending, onDone, pendingRef]);

  return null;
}

/**
 * "Cancelar" del diálogo. Mientras la acción se envía queda con
 * `aria-disabled` y no hace nada: la acción ya está en camino y cancelar
 * haría creer que no se ejecutó. No usa el `disabled` nativo para no perder
 * el foco (como `SubmitButton`).
 */
function CancelButton({
  label,
  buttonRef,
  onCancel,
}: {
  label: string;
  buttonRef: RefObject<HTMLButtonElement | null>;
  onCancel: () => void;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      ref={buttonRef}
      type="button"
      aria-disabled={pending || undefined}
      onClick={() => {
        if (!pending) onCancel();
      }}
      className={panelButtonClass("secundario", "lg", "w-full sm:w-auto")}
    >
      {label}
    </button>
  );
}

/**
 * Confirmación de una acción irreversible o de alto impacto (spec 6.3), con
 * el `<dialog>` nativo del navegador: bloquea el resto de la página, se cierra
 * con Escape o con "Cancelar" y devuelve el foco al botón que lo abrió. El
 * foco entra en "Cancelar", para que un Enter apresurado no confirme. El
 * botón de confirmar es un `SubmitButton`: queda deshabilitado mientras la
 * acción corre, y el diálogo se cierra solo al terminar. Mientras corre,
 * ni Escape, ni un clic en el fondo, ni "Cancelar" lo cierran: la acción ya
 * está en camino y se ejecutará igual.
 */
export function ConfirmDialog({
  triggerLabel,
  triggerClassName,
  title,
  description,
  confirmLabel,
  confirmClassName,
  pendingLabel = "Procesando…",
  cancelLabel = "Cancelar",
  action,
  fields,
  tone = "normal",
  disabled,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  // Desplazamiento del fondo antes de abrir, para devolverlo tal cual (puede venir bloqueado por un panel lateral).
  const previousOverflow = useRef<string | null>(null);
  // La acción del formulario está en curso (lo escribe `FormPendingWatcher`).
  const pendingRef = useRef(false);
  const titleId = useId();
  const descriptionId = useId();

  function open() {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    previousOverflow.current = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.showModal();
    cancelRef.current?.focus();
  }

  function restoreScroll() {
    if (previousOverflow.current === null) return;
    document.body.style.overflow = previousOverflow.current;
    previousOverflow.current = null;
  }

  function close() {
    dialogRef.current?.close();
  }

  // Si la página cambia con el diálogo abierto, no deja bloqueado el desplazamiento.
  useEffect(() => restoreScroll, []);

  const Icon = tone === "peligro" ? IconWarning : IconInfo;

  return (
    <>
      <button
        type="button"
        onClick={open}
        disabled={disabled}
        aria-haspopup="dialog"
        className={triggerClassName ?? panelButtonClass(tone === "peligro" ? "peligro" : "primario")}
      >
        {triggerLabel}
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onClose={restoreScroll}
        onCancel={(event) => {
          // Mientras la acción se envía, Escape no cierra: ya está en camino.
          if (pendingRef.current) event.preventDefault();
        }}
        onKeyDown={(event) => {
          // Algunos navegadores no dejan cancelar un segundo Escape seguido; frenarlo en
          // la tecla cubre también ese caso.
          if (event.key === "Escape" && pendingRef.current) event.preventDefault();
        }}
        onClick={(event) => {
          // Un clic en el fondo oscuro (fuera de la caja) equivale a cancelar, salvo durante el envío.
          if (event.target === event.currentTarget && !pendingRef.current) close();
        }}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-tarjeta border border-borde bg-superficie p-0 text-tinta shadow-2 backdrop:bg-tinta/50"
      >
        <div className="flex flex-col gap-5 p-6">
          <div className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className={cx(
                "grid size-11 shrink-0 place-items-center rounded-full",
                tone === "peligro" ? "bg-peligro-suave text-peligro" : "bg-marca-50 text-marca-600",
              )}
            >
              <Icon className="size-6" />
            </span>
            <div className="flex min-w-0 flex-col gap-2 pt-1">
              <h2 id={titleId} className="text-xl font-bold leading-snug tracking-tight">
                {title}
              </h2>
              <div id={descriptionId} className="text-base leading-relaxed text-tinta-suave">
                {description}
              </div>
            </div>
          </div>

          <form action={action} className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            {fields
              ? Object.entries(fields).map(([name, value]) => (
                  <input key={name} type="hidden" name={name} value={value} />
                ))
              : null}
            <CancelButton label={cancelLabel} buttonRef={cancelRef} onCancel={close} />
            <SubmitButton
              pendingLabel={pendingLabel}
              className={
                confirmClassName ??
                panelButtonClass(tone === "peligro" ? "peligro" : "primario", "lg", "w-full sm:w-auto")
              }
            >
              {confirmLabel}
            </SubmitButton>
            <FormPendingWatcher pendingRef={pendingRef} onDone={close} />
          </form>
        </div>
      </dialog>
    </>
  );
}
