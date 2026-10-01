"use client";

import { useEffect, useRef } from "react";
import { panelButtonClass } from "@/components/panel-ui";
import { IconInfo, IconSpinner } from "@/components/icons";

/**
 * Confirmación del cobro en taquilla, con la misma apariencia que
 * `ConfirmDialog` del kit. No se usa `ConfirmDialog` porque este diálogo tiene
 * que vivir dentro del formulario del asistente: su botón envía ese mismo
 * formulario, que lleva las fotos elegidas en los pasos anteriores (un
 * formulario no puede ir dentro de otro). Tampoco sirve `SubmitButton`: el
 * asistente envía con su propio `FormData` para que React no vacíe los
 * archivos, así que la espera la marca `submitting`. Como `SubmitButton`, el
 * botón de cobrar no usa `disabled` nativo durante la espera: el foco sigue
 * en él (un botón deshabilitado lo pierde y el foco caería al cuerpo del
 * diálogo) y el reenvío se bloquea cancelando el clic.
 */
export function ChargeDialog({
  open,
  onClose,
  submitting,
  amountLabel,
  details,
}: {
  open: boolean;
  onClose: () => void;
  submitting: boolean;
  /** Total a cobrar ya formateado, por ejemplo "Bs. 1.460,00". */
  amountLabel: string;
  /** Datos que se repasan antes de cobrar. */
  details: Array<{ label: string; value: string }>;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const previousOverflow = useRef<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      previousOverflow.current = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      dialog.showModal();
      cancelRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Si el componente desaparece con el diálogo abierto (venta registrada), devuelve el desplazamiento.
  useEffect(
    () => () => {
      if (previousOverflow.current !== null) document.body.style.overflow = previousOverflow.current;
    },
    [],
  );

  function restoreScroll() {
    if (previousOverflow.current === null) return;
    document.body.style.overflow = previousOverflow.current;
    previousOverflow.current = null;
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="cobro-titulo"
      aria-describedby="cobro-descripcion"
      onClose={() => {
        restoreScroll();
        onClose();
      }}
      onCancel={(event) => {
        // Mientras se registra la venta, Escape no cierra: el cobro ya está en camino.
        if (submitting) event.preventDefault();
      }}
      onKeyDown={(event) => {
        // Chrome no deja cancelar un segundo Escape seguido sin una activación
        // del usuario (close watcher) y cerraría el diálogo igual: se frena
        // aquí también, como en `ConfirmDialog`.
        if (event.key === "Escape" && submitting) event.preventDefault();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !submitting) dialogRef.current?.close();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-tarjeta border border-borde bg-superficie p-0 text-tinta shadow-2 backdrop:bg-tinta/50"
    >
      <div className="flex flex-col gap-5 p-6">
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="grid size-11 shrink-0 place-items-center rounded-full bg-marca-50 text-marca-600"
          >
            <IconInfo className="size-6" />
          </span>
          <div className="flex min-w-0 flex-col gap-2 pt-1">
            <h2 id="cobro-titulo" className="text-xl font-bold leading-snug tracking-tight">
              ¿Cobrar <span className="tabular">{amountLabel}</span> en efectivo?
            </h2>
            <p id="cobro-descripcion" className="text-base leading-relaxed text-tinta-suave">
              Al confirmar se registra la venta y se emite el ticket. No se puede deshacer desde esta pantalla.
            </p>
          </div>
        </div>

        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-control bg-lienzo p-4 text-[15px]">
          {details.map((d) => (
            <div key={d.label} className="contents">
              <dt className="font-medium text-tinta-suave">{d.label}</dt>
              <dd className="tabular min-w-0 break-words font-semibold text-tinta">{d.value}</dd>
            </div>
          ))}
        </dl>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            ref={cancelRef}
            type="button"
            onClick={() => dialogRef.current?.close()}
            disabled={submitting}
            className={panelButtonClass("secundario", "lg", "w-full sm:w-auto")}
          >
            Revisar los datos
          </button>
          <button
            type="submit"
            aria-disabled={submitting ? true : undefined}
            onClick={(event) => {
              // El cobro ya está en camino: un segundo clic o Enter no lo reenvía.
              if (submitting) event.preventDefault();
            }}
            className={panelButtonClass("primario", "lg", "w-full sm:w-auto")}
          >
            {submitting ? (
              <>
                <IconSpinner className="size-5 shrink-0 animate-spin motion-reduce:animate-none" />
                Cobrando…
              </>
            ) : (
              "Sí, cobrar y emitir el ticket"
            )}
          </button>
          <span className="sr-only" role="status">
            {submitting ? "Registrando la venta…" : ""}
          </span>
        </div>
      </div>
    </dialog>
  );
}
