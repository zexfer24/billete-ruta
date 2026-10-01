import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { PanelFeedback } from "@/components/panel-feedback";
import { Alert } from "@/components/alert";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { SubmitButton } from "@/components/submit-button";
import { EmptyState, PANEL_TD_CLASS, PANEL_TH_CLASS, StatusBadge, panelButtonClass, panelInputClass } from "@/components/panel-ui";
import { IconCheckCircle, IconExternal, IconSearch, IconXCircle } from "@/components/icons";
import { formatMoney } from "@/lib/decimal";
import { maskIdNumber } from "@/lib/identity";
import { formatCaracasDateTime24 } from "@/lib/time";
import { PROOF_STATUS_LABELS, reservationStatusLabel, type StatusTone } from "@/lib/labels";
import type { ProofCoverage, ProofHistoryItem, ProofReview } from "@/modules/payments";
import { countLabel } from "../_dashboard/text";
import { approveProofAction, rejectProofAction } from "./actions";
import { Disclosure, DetailList } from "./disclosure";
import { ProofDecisionBar } from "./proof-decision";
import { showsUsdEquivalent } from "./money";
import { pasajerosUrlFromHidden } from "./urls";

/**
 * Piezas de la revisión de un comprobante, compartidas por el panel lateral
 * de comprobante y por la sección "Comprobantes por revisar" del detalle de
 * reserva, para no duplicar el marcado entre las dos.
 */

/** Qué cubre un comprobante frente al saldo pendiente, en lenguaje llano. */
export function coverageBadge(coverage: ProofCoverage): { label: string; tone: StatusTone } {
  switch (coverage.kind) {
    case "ABONO_PARCIAL":
      return { label: "Paga una parte", tone: "marca" };
    case "PAGO_COMPLETO":
      return { label: "Completa el pago", tone: "exito" };
    case "EXCEDE_SALDO":
      return { label: `Paga de más: ${formatMoney(coverage.excessUsd, "USD")}`, tone: "alerta" };
  }
}

/** Lo que pasará al aprobar, con los montos: es la descripción de la confirmación. */
function approvalConsequence(coverage: ProofCoverage, amountUsd: Prisma.Decimal): string {
  const suma = `Se sumarán ${formatMoney(amountUsd, "USD")} a lo pagado.`;
  switch (coverage.kind) {
    case "ABONO_PARCIAL":
      return `${suma} Quedará un saldo de ${formatMoney(coverage.balanceAfterUsd, "USD")}; el ticket se emite cuando el saldo llegue a cero.`;
    case "PAGO_COMPLETO":
      return `${suma} El saldo quedará en ${formatMoney(coverage.balanceAfterUsd, "USD")} y se emitirá el ticket.`;
    case "EXCEDE_SALDO":
      return `Este pago supera el saldo en ${formatMoney(coverage.excessUsd, "USD")}. El saldo quedará en ${formatMoney(coverage.balanceAfterUsd, "USD")} y se emitirá el ticket.`;
  }
}

/** Descripción de la confirmación de "Aprobar pago": las consecuencias y que no se deshace. */
function approveDescription(coverage: ProofCoverage | null, amountUsd: Prisma.Decimal) {
  return (
    <p>
      {coverage ? approvalConsequence(coverage, amountUsd) : `Se sumarán ${formatMoney(amountUsd, "USD")} a lo pagado.`}{" "}
      Esta acción no se puede deshacer.
    </p>
  );
}

/**
 * Decisión sobre un comprobante pendiente. "Aprobar pago" es la acción
 * principal y pide confirmación con sus consecuencias en números, porque no
 * se puede deshacer. "Rechazar" queda plegado: se abre para escribir el
 * motivo, así no se pulsa por error junto al de aprobar.
 */
export function ProofActions({
  proofId,
  code,
  amountUsd,
  coverage,
  hidden,
}: {
  proofId: string;
  code: string;
  amountUsd: Prisma.Decimal;
  coverage: ProofCoverage | null;
  hidden: Record<string, string>;
}) {
  const motivoId = `motivo-${proofId}`;
  const ayudaId = `${motivoId}-ayuda`;

  return (
    <div className="flex flex-col gap-3">
      <ConfirmDialog
        triggerLabel={
          <>
            <IconCheckCircle className="size-5" />
            Aprobar pago
          </>
        }
        triggerClassName={panelButtonClass("exito", "lg", "w-full sm:w-auto")}
        title={`¿Aprobar el pago de la reserva ${code}?`}
        description={approveDescription(coverage, amountUsd)}
        confirmLabel="Sí, aprobar el pago"
        confirmClassName={panelButtonClass("exito", "lg", "w-full sm:w-auto")}
        pendingLabel="Aprobando…"
        action={approveProofAction}
        fields={{ ...hidden, proofId }}
      />

      <details className="group rounded-control border border-borde">
        <summary className="foco flex min-h-12 cursor-pointer list-none items-center gap-2 rounded-control px-4 py-2.5 text-[15px] font-semibold text-peligro hover:bg-peligro-suave [&::-webkit-details-marker]:hidden">
          <IconXCircle className="size-5 shrink-0" />
          Rechazar este comprobante
        </summary>
        <form action={rejectProofAction} className="flex flex-col gap-3 border-t border-borde px-4 py-4">
          <input type="hidden" name="proofId" value={proofId} />
          {Object.entries(hidden).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <label htmlFor={motivoId} className="text-sm font-semibold text-tinta">
            Motivo del rechazo
          </label>
          <textarea
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
          <SubmitButton pendingLabel="Rechazando…" className={panelButtonClass("peligro", "md", "w-full sm:w-fit")}>
            Rechazar comprobante
          </SubmitButton>
        </form>
      </details>
    </div>
  );
}

/**
 * Historial de pagos plegable con su cantidad en palabras ("Historial de
 * pagos · 2 pagos"). Sin pagos no hay nada que desplegar: se dice en la misma
 * línea y no se ofrece un plegable vacío.
 */
export function PaymentHistory({ history }: { history: ProofHistoryItem[] }) {
  if (history.length === 0) {
    return (
      <div className="flex min-h-12 flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-control border border-borde bg-superficie px-4 py-2.5">
        <p className="text-base font-semibold text-tinta">Historial de pagos</p>
        <p className="text-[15px] text-tinta-suave">Sin pagos todavía</p>
      </div>
    );
  }
  return (
    <Disclosure title={`Historial de pagos · ${countLabel(history.length, "pago", "pagos")}`}>
      <ProofHistoryTable history={history} />
    </Disclosure>
  );
}

/** Historial de pagos de una reserva: comprobantes revisados y cobros en efectivo. */
export function ProofHistoryTable({ history }: { history: ProofHistoryItem[] }) {
  if (history.length === 0) {
    return <p className="text-[15px] text-tinta-suave">Esta reserva todavía no tiene pagos anteriores.</p>;
  }
  return (
    <div className="relative overflow-x-auto">
      <table className="w-full text-left">
        <thead className="border-b border-borde">
          <tr>
            <th scope="col" className={PANEL_TH_CLASS}>
              Fecha
            </th>
            <th scope="col" className={PANEL_TH_CLASS}>
              Forma
            </th>
            <th scope="col" className={PANEL_TH_CLASS}>
              Monto
            </th>
            <th scope="col" className={PANEL_TH_CLASS}>
              Estado
            </th>
          </tr>
        </thead>
        <tbody>
          {history.map((item) => (
            <tr key={item.id} className="border-b border-borde last:border-0">
              <td className={`${PANEL_TD_CLASS} tabular`}>{formatCaracasDateTime24(item.at)}</td>
              <td className={PANEL_TD_CLASS}>{item.kind === "COMPROBANTE" ? "Comprobante" : "Efectivo"}</td>
              <td className={`${PANEL_TD_CLASS} tabular`}>
                {formatMoney(item.amount, item.currency)}
                {showsUsdEquivalent(item.currency) ? (
                  <span className="block text-tinta-suave">Equivale a {formatMoney(item.amountUsd, "USD")}</span>
                ) : null}
              </td>
              <td className={PANEL_TD_CLASS}>
                {item.kind === "EFECTIVO" ? "Cobrado" : item.status ? PROOF_STATUS_LABELS[item.status] : "Sin revisar"}
                {item.kind === "COMPROBANTE" && item.status === "RECHAZADO" && item.rejectionReason ? (
                  <span className="block text-tinta-suave">Motivo: {item.rejectionReason}</span>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** El comprobante no existe o es de otra agencia: se dice con claridad y se ofrece volver. */
export function ProofNotFound({ closeHref }: { closeHref: string }) {
  return (
    <EmptyState
      icon={<IconSearch />}
      title="No encontramos este comprobante"
      description="Puede que el enlace esté incompleto o que el comprobante sea de otra agencia."
      action={
        <Link href={closeHref} scroll={false} className={panelButtonClass("secundario")}>
          Volver a la lista
        </Link>
      }
    />
  );
}

/**
 * Contenido del panel lateral de revisión de un comprobante, en el orden en
 * que se decide: cuánto envió y qué cubre, la imagen y, plegado, el resto de
 * los datos de la reserva y su historial. La decisión va en una barra fija al
 * pie del panel (`ProofDecisionBar`), visible desde la primera pantalla.
 */
export function ProofReviewPanel({
  review,
  hidden,
  error,
}: {
  review: ProofReview;
  hidden: Record<string, string>;
  error?: string;
}) {
  const { proof, reservation, coverage, history } = review;
  const badge = coverage ? coverageBadge(coverage) : null;
  const verReservaHref = pasajerosUrlFromHidden(hidden, { reserva: reservation.id });
  const imagen = `/api/archivos/${proof.imagePath}`;

  return (
    <div className="flex flex-col gap-6">
      <PanelFeedback error={error} />

      <div className="flex flex-col gap-3 rounded-tarjeta border border-borde bg-lienzo p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-base font-semibold text-tinta">{reservation.holderName}</p>
            <p className="tabular text-sm text-tinta-suave">
              {maskIdNumber(reservation.holderIdNumber)} · Reserva {reservation.code}
            </p>
          </div>
          {badge ? <StatusBadge label={badge.label} tone={badge.tone} /> : null}
        </div>
        <div>
          <p className="text-sm font-semibold text-tinta-suave">Monto enviado</p>
          <p className="tabular text-3xl font-bold tracking-tight text-tinta">
            {formatMoney(proof.amount, proof.currency)}
          </p>
          {showsUsdEquivalent(proof.currency) ? (
            <p className="tabular text-[15px] text-tinta-suave">Equivale a {formatMoney(proof.amountUsd, "USD")}</p>
          ) : null}
        </div>
        <DetailList
          items={[
            { label: "Referencia", value: <span className="tabular font-semibold">{proof.reference}</span> },
            { label: "Forma de pago", value: proof.paymentMethodName },
            { label: "Enviado el", value: <span className="tabular">{formatCaracasDateTime24(proof.createdAt)}</span> },
            ...(coverage
              ? [
                  {
                    label: "Saldo después",
                    value: (
                      <span className="tabular font-semibold">{formatMoney(coverage.balanceAfterUsd, "USD")}</span>
                    ),
                  },
                ]
              : []),
          ]}
        />
      </div>

      <figure className="flex flex-col gap-2">
        {/* Imagen subida por el pasajero y servida por /api/archivos: no pasa por next/image. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imagen}
          alt={`Comprobante de pago con referencia ${proof.reference}`}
          className="max-h-64 w-full rounded-control border border-borde bg-lienzo object-contain"
        />
        <figcaption>
          <a
            href={imagen}
            target="_blank"
            rel="noreferrer"
            className="foco inline-flex min-h-11 items-center gap-1.5 rounded-control px-2 text-[15px] font-semibold text-marca-700 hover:bg-marca-50"
          >
            <IconExternal className="size-5" />
            Ver la imagen en tamaño completo
            <span className="sr-only">(se abre en otra pestaña)</span>
          </a>
        </figcaption>
      </figure>

      {proof.status === "PENDIENTE" ? null : (
        <Alert tone={proof.status === "APROBADO" ? "exito" : "info"} role="none" title="Este comprobante ya se revisó">
          Fue {proof.status === "APROBADO" ? "aprobado" : "rechazado"}
          {proof.reviewedAt ? ` el ${formatCaracasDateTime24(proof.reviewedAt)}` : ""}.
          {proof.status === "RECHAZADO" && proof.rejectionReason ? ` Motivo: ${proof.rejectionReason}` : ""}
        </Alert>
      )}

      <div className="flex flex-col gap-3">
        <Disclosure title="Datos de la reserva">
          <div className="flex flex-col gap-4">
            <DetailList
              items={[
                { label: "Ruta", value: `${reservation.origin} → ${reservation.destination}` },
                {
                  label: "Salida",
                  value: <span className="tabular">{formatCaracasDateTime24(reservation.departsAt)}</span>,
                },
                { label: "Personas", value: countLabel(reservation.passengerCount, "persona", "personas") },
                { label: "Estado", value: reservationStatusLabel(reservation.status) },
                { label: "Total", value: <span className="tabular">{formatMoney(reservation.totalUsd, "USD")}</span> },
                {
                  label: "Pagado antes",
                  value: <span className="tabular">{formatMoney(reservation.paidUsd, "USD")}</span>,
                },
              ]}
            />
            <Link href={verReservaHref} scroll={false} className={panelButtonClass("secundario", "md", "w-fit")}>
              Ver la reserva completa
            </Link>
          </div>
        </Disclosure>
        <PaymentHistory history={history} />
      </div>

      {/* Al final del cuerpo: la barra queda pegada al pie del panel desde la
          primera pantalla y, al llegar abajo, no tapa el historial. */}
      {proof.status === "PENDIENTE" ? (
        <ProofDecisionBar
          proofId={proof.id}
          code={reservation.code}
          approveDescription={approveDescription(coverage, proof.amountUsd)}
          hidden={hidden}
        />
      ) : null}
    </div>
  );
}
