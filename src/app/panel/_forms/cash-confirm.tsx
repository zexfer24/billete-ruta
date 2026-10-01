"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { IconInfo, IconWarning } from "@/components/icons";
import { SubmitButton } from "@/components/submit-button";
import { cx, panelButtonClass } from "@/components/ui-classes";
import { amountToCents, cashConfirmText, decimalToCents, type CashConfirmText, type CashCurrency } from "./cash-confirm-text";
import type { CashEquivalent } from "./cash-equivalents";

const MONEDAS: readonly CashCurrency[] = ["USD", "VES", "COP", "USDT"];
const MONTO_INVALIDO = "Escribe un monto mayor que cero, con hasta dos decimales. Por ejemplo, 12,50.";

/**
 * Sigue el envío del formulario: guarda en `pendingRef` si el cobro está en
 * camino (los manejadores del `<dialog>` lo leen para no cerrarse a mitad del
 * envío) y cierra el diálogo cuando termina. Mismo patrón que `ConfirmDialog`.
 */
function CloseWhenDone({ onDone, pendingRef }: { onDone: () => void; pendingRef: { current: boolean } }) {
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
 * "Revisar el monto": mientras el cobro se envía queda con `aria-disabled` y
 * no hace nada (sin el `disabled` nativo, para que el foco no se pierda): el
 * cobro ya está en camino y cerrar el diálogo haría creer que no se hizo.
 */
function ReviewButton({ buttonRef, onClose }: { buttonRef: { current: HTMLButtonElement | null }; onClose: () => void }) {
  const { pending } = useFormStatus();
  return (
    <button
      ref={buttonRef}
      type="button"
      aria-disabled={pending || undefined}
      onClick={() => {
        if (!pending) onClose();
      }}
      className={panelButtonClass("secundario", "lg", "w-full sm:w-auto aria-disabled:cursor-not-allowed aria-disabled:opacity-60")}
    >
      Revisar el monto
    </button>
  );
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
export function CashConfirmSubmit({
  balanceUsd,
  holderName,
  equivalents = [],
}: {
  balanceUsd: string;
  holderName?: string;
  /** Lo que falta en cada moneda y su tasa, para dar el saldo resultante también en bolívares o pesos. */
  equivalents?: readonly CashEquivalent[];
}) {
  const { pending } = useFormStatus();
  const pendingRef = useRef(false);
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
    // Con un cobro en camino no se vuelve a abrir: se confirmaría dos veces.
    if (!form || !dialog || dialog.open || pendingRef.current) return;

    const montoInput = form.elements.namedItem("amount");
    const monedaSelect = form.elements.namedItem("currency");
    if (!(montoInput instanceof HTMLInputElement) || !(monedaSelect instanceof HTMLSelectElement)) return;

    const cents = amountToCents(montoInput.value);
    montoInput.setCustomValidity(montoInput.value.trim() !== "" && cents === null ? MONTO_INVALIDO : "");
    if (!form.reportValidity() || cents === null) return;

    const moneda = MONEDAS.find((m) => m === monedaSelect.value) ?? "USD";
    const equivalente = equivalents.find((e) => e.currency === moneda);
    const tasa = equivalente?.rateFromUsd ? Number(equivalente.rateFromUsd) : null;
    setTexto(
      cashConfirmText({
        amountCents: cents,
        currency: moneda,
        balanceCents: decimalToCents(balanceUsd) ?? 0,
        holderName,
        local:
          equivalente && equivalente.balanceCents !== null && tasa !== null && equivalente.rateLabel
            ? { balanceCents: equivalente.balanceCents, rateFromUsd: tasa, rateLabel: equivalente.rateLabel }
            : undefined,
      }),
    );
    previousOverflow.current = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setAbierto(true);
    dialog.showModal();
    cancelRef.current?.focus();
  }, [balanceUsd, holderName, equivalents]);

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
        aria-disabled={pending || undefined}
        className={panelButtonClass("exito", "lg", "w-full sm:w-fit aria-disabled:cursor-not-allowed aria-disabled:opacity-60")}
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
        // Mientras el cobro se envía, ni Escape ni un clic en el fondo cierran
        // el diálogo: el operador podría creer que no se cobró y repetirlo.
        onCancel={(event) => {
          if (pendingRef.current) event.preventDefault();
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape" && pendingRef.current) event.preventDefault();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget && !pendingRef.current) close();
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
            <ReviewButton buttonRef={cancelRef} onClose={close} />
            <SubmitButton
              disabled={!abierto}
              pendingLabel="Registrando cobro…"
              className={panelButtonClass("exito", "lg", "w-full sm:w-auto")}
            >
              Sí, registrar cobro
            </SubmitButton>
            <CloseWhenDone onDone={close} pendingRef={pendingRef} />
          </div>
        </div>
      </dialog>
    </>
  );
}
