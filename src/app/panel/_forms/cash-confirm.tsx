"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { IconInfo, IconWarning } from "@/components/icons";
import { SubmitButton } from "@/components/submit-button";
import { cx, panelButtonClass } from "@/components/ui-classes";
import { amountToCents, cashConfirmText, decimalToCents, type CashConfirmText, type CashCurrency } from "./cash-confirm-text";

const MONEDAS: readonly CashCurrency[] = ["USD", "VES", "COP", "USDT"];
const MONTO_INVALIDO = "Escribe un monto mayor que cero, con hasta dos decimales. Por ejemplo, 12,50.";

/** Cierra el diálogo cuando el envío del formulario termina. */
function CloseWhenDone({ onDone }: { onDone: () => void }) {
  const { pending } = useFormStatus();
  const wasPending = useRef(false);
  useEffect(() => {
    if (wasPending.current && !pending) onDone();
    wasPending.current = pending;
  }, [pending, onDone]);
  return null;
}

/**
 * Botón "Registrar cobro" con confirmación (principio 6 de la spec). Va
 * dentro del formulario de cobro: al pulsarlo valida los campos, lee el
 * monto y la moneda escritos y abre un `<dialog>` nativo con las cifras
 * ("Registrarás $ 41,00 en efectivo a nombre de…", el saldo que queda y, si
 * el monto supera el saldo, una advertencia destacada). El botón de confirmar
 * es el `SubmitButton` del mismo formulario, así que envía los campos tal
 * cual. No es `ConfirmDialog` porque ese arma su propio formulario y no ve lo
 * que el operador escribió.
 */
export function CashConfirmSubmit({ balanceUsd, holderName }: { balanceUsd: string; holderName?: string }) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const previousOverflow = useRef<string | null>(null);
  const [texto, setTexto] = useState<CashConfirmText | null>(null);
  // El botón de confirmar solo está activo con el diálogo abierto: así un
  // Enter en el campo del monto no envía el cobro sin pasar por aquí.
  const [abierto, setAbierto] = useState(false);
  const titleId = useId();
  const descriptionId = useId();
  const excessId = useId();

  function restoreScroll() {
    if (previousOverflow.current === null) return;
    document.body.style.overflow = previousOverflow.current;
    previousOverflow.current = null;
  }

  function close() {
    dialogRef.current?.close();
  }

  useEffect(() => restoreScroll, []);

  const open = useCallback(() => {
    const form = triggerRef.current?.form;
    const dialog = dialogRef.current;
    if (!form || !dialog || dialog.open) return;

    const montoInput = form.elements.namedItem("amount");
    const monedaSelect = form.elements.namedItem("currency");
    if (!(montoInput instanceof HTMLInputElement) || !(monedaSelect instanceof HTMLSelectElement)) return;

    const cents = amountToCents(montoInput.value);
    montoInput.setCustomValidity(montoInput.value.trim() !== "" && cents === null ? MONTO_INVALIDO : "");
    if (!form.reportValidity() || cents === null) return;

    const moneda = MONEDAS.find((m) => m === monedaSelect.value) ?? "USD";
    setTexto(
      cashConfirmText({
        amountCents: cents,
        currency: moneda,
        balanceCents: decimalToCents(balanceUsd) ?? 0,
        holderName,
      }),
    );
    previousOverflow.current = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setAbierto(true);
    dialog.showModal();
    cancelRef.current?.focus();
  }, [balanceUsd, holderName]);

  // Enter en un campo del formulario abre la confirmación en vez de enviar.
  useEffect(() => {
    const form = triggerRef.current?.form;
    if (!form) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Enter" || !(event.target instanceof HTMLInputElement)) return;
      if (dialogRef.current?.contains(event.target)) return;
      event.preventDefault();
      open();
    }
    form.addEventListener("keydown", onKeyDown);
    return () => form.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={open}
        aria-haspopup="dialog"
        className={panelButtonClass("exito", "lg", "w-full sm:w-fit")}
      >
        Registrar cobro
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        // El aviso del excedente va fuera del bloque de descripción (ocupa todo
        // el ancho), así que se suma aparte para que el lector también lo lea.
        aria-describedby={texto?.excess ? `${descriptionId} ${excessId}` : descriptionId}
        onClose={() => {
          setAbierto(false);
          restoreScroll();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
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
              <h2 id={titleId} className="text-xl font-bold leading-snug tracking-tight">
                ¿Registrar este cobro?
              </h2>
              <div id={descriptionId} className="flex flex-col gap-2 text-base leading-relaxed text-tinta-suave">
                {texto ? (
                  <>
                    <p className="tabular font-semibold text-tinta">{texto.lead}</p>
                    <p className="tabular">{texto.outcome}</p>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          {texto?.excess ? (
            <p
              id={excessId}
              className={cx(
                "tabular flex items-start gap-2 rounded-control border border-alerta/30 bg-alerta-suave px-4 py-3",
                "text-base font-semibold text-alerta",
              )}
            >
              <IconWarning className="mt-0.5 size-5 shrink-0" />
              {texto.excess}
            </p>
          ) : null}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              ref={cancelRef}
              type="button"
              onClick={close}
              className={panelButtonClass("secundario", "lg", "w-full sm:w-auto")}
            >
              Revisar el monto
            </button>
            <SubmitButton
              disabled={!abierto}
              pendingLabel="Registrando cobro…"
              className={panelButtonClass("exito", "lg", "w-full sm:w-auto")}
            >
              Sí, registrar cobro
            </SubmitButton>
            <CloseWhenDone onDone={close} />
          </div>
        </div>
      </dialog>
    </>
  );
}
