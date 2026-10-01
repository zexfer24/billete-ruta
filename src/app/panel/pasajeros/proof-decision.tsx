"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { SubmitButton } from "@/components/submit-button";
import { IconCheckCircle, IconXCircle } from "@/components/icons";
import { panelButtonClass, panelInputClass } from "@/components/ui-classes";
import { approveProofAction, rejectProofAction } from "./actions";

/**
 * Decisión sobre un comprobante dentro del panel lateral de revisión. La
 * barra con "Aprobar pago" y "Rechazar" queda fija al pie del panel (su
 * propio contenedor de desplazamiento), así la acción principal se ve desde
 * la primera pantalla mientras se compara la imagen con el banco (spec 7.2).
 * El motivo del rechazo no vive en la barra: se abre justo encima de ella, en
 * el cuerpo del panel, para que el teclado del teléfono no la tape entera.
 */
export function ProofDecisionBar({
  proofId,
  code,
  approveDescription,
  hidden,
}: {
  proofId: string;
  code: string;
  /** Lo que pasará al aprobar, con los montos (ya formateados en el servidor). */
  approveDescription: ReactNode;
  hidden: Record<string, string>;
}) {
  const [rejecting, setRejecting] = useState(false);
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const formId = `rechazo-${proofId}`;
  const motivoId = `motivo-${proofId}`;
  const ayudaId = `${motivoId}-ayuda`;

  useEffect(() => {
    if (!rejecting) return;
    const reason = reasonRef.current;
    if (!reason) return;
    reason.focus({ preventScroll: true });
    reason.scrollIntoView({ block: "center" });
  }, [rejecting]);

  return (
    <>
      {rejecting ? (
        <form
          id={formId}
          action={rejectProofAction}
          className="flex flex-col gap-3 rounded-control border border-borde bg-lienzo p-4"
        >
          <input type="hidden" name="proofId" value={proofId} />
          {Object.entries(hidden).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <label htmlFor={motivoId} className="text-base font-semibold text-tinta">
            Motivo del rechazo
          </label>
          <textarea
            ref={reasonRef}
            id={motivoId}
            name="reason"
            required
            minLength={4}
            rows={3}
            aria-describedby={ayudaId}
            className={panelInputClass("min-h-24 resize-y")}
          />
          <p id={ayudaId} className="text-sm text-tinta-suave">
            El pasajero lo verá. Por ejemplo: «El monto no coincide», «La referencia no aparece en el banco» o
            «La imagen no se lee».
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => setRejecting(false)}
              className={panelButtonClass("secundario", "md", "w-full sm:w-auto")}
            >
              No rechazar
            </button>
            <SubmitButton pendingLabel="Rechazando…" className={panelButtonClass("peligro", "md", "w-full sm:w-auto")}>
              Rechazar comprobante
            </SubmitButton>
          </div>
        </form>
      ) : null}

      <section
        aria-labelledby="decision-titulo"
        className="sticky bottom-0 z-10 -mx-5 -mb-5 flex flex-col gap-3 border-t border-borde bg-superficie px-5 py-3 shadow-2 sm:-mx-6 sm:px-6"
      >
        <div>
          <h3 id="decision-titulo" className="text-base font-semibold text-tinta">
            ¿El pago está en tu cuenta?
          </h3>
          <p className="text-sm text-tinta-suave">Compara la referencia y el monto con tu banco antes de decidir.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <ConfirmDialog
            triggerLabel={
              <>
                <IconCheckCircle className="size-5" />
                Aprobar pago
              </>
            }
            triggerClassName={panelButtonClass("exito", "lg", "w-full sm:w-auto")}
            title={`¿Aprobar el pago de la reserva ${code}?`}
            description={approveDescription}
            confirmLabel="Sí, aprobar el pago"
            confirmClassName={panelButtonClass("exito", "lg", "w-full sm:w-auto")}
            pendingLabel="Aprobando…"
            action={approveProofAction}
            fields={{ ...hidden, proofId }}
          />
          <button
            type="button"
            aria-expanded={rejecting}
            aria-controls={rejecting ? formId : undefined}
            onClick={() => setRejecting((value) => !value)}
            className={panelButtonClass("secundario", "lg", "w-full sm:w-auto")}
          >
            <IconXCircle className="size-5 shrink-0 text-peligro" />
            Rechazar
          </button>
        </div>
      </section>
    </>
  );
}
