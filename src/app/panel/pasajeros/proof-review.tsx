import Link from "next/link";
import { PanelFeedback } from "@/components/panel-feedback";
import { StatusBadge, panelButtonClass } from "@/components/panel-ui";
import { formatMoney } from "@/lib/decimal";
import { formatCaracasDateTime24 } from "@/lib/time";
import { PROOF_STATUS_LABELS, reservationStatusLabel, type StatusTone } from "@/lib/labels";
import type { ProofCoverage, ProofHistoryItem, ProofReview } from "@/modules/payments";
import { approveProofAction, rejectProofAction } from "./actions";
import { pasajerosUrlFromHidden } from "./urls";

/**
 * Contenido compartido de la revisión de un comprobante, usado tanto en el
 * panel lateral de comprobante como en la sección "Comprobantes por revisar"
 * del detalle de reserva, para no duplicar el marcado entre las dos.
 */

/** Texto y tono de la cobertura de un comprobante frente al saldo pendiente. */
export function coverageBadge(coverage: ProofCoverage): { label: string; tone: StatusTone } {
  switch (coverage.kind) {
    case "ABONO_PARCIAL":
      return { label: "Abono parcial", tone: "marca" };
    case "PAGO_COMPLETO":
      return { label: "Completa el pago", tone: "exito" };
    case "EXCEDE_SALDO":
      return {
        label: `Excede el saldo en ${formatMoney(coverage.excessUsd, "USD")}`,
        tone: "alerta",
      };
  }
}

/** Campos ocultos con el contexto de retorno (vista, página, filtros y reserva de origen). */
function HiddenFields({ hidden }: { hidden: Record<string, string> }) {
  return (
    <>
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
    </>
  );
}

/**
 * Los dos formularios de decisión de un comprobante pendiente: aprobar y
 * rechazar con motivo. Se usan desde el panel de comprobante y desde el
 * detalle de reserva, con el mismo `hidden` de contexto en ambos casos.
 */
export function ProofActions({
  proofId,
  hidden,
}: {
  proofId: string;
  hidden: Record<string, string>;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-[var(--color-borde)] pt-4 sm:flex-row sm:items-start">
      <form action={approveProofAction}>
        <input type="hidden" name="proofId" value={proofId} />
        <HiddenFields hidden={hidden} />
        <button type="submit" className={panelButtonClass("exito")}>
          Aprobar pago
        </button>
      </form>
      <form action={rejectProofAction} className="flex flex-1 flex-col gap-2">
        <input type="hidden" name="proofId" value={proofId} />
        <HiddenFields hidden={hidden} />
        <label className="flex flex-col gap-1 text-sm font-medium">
          Motivo del rechazo
          <textarea
            name="reason"
            required
            minLength={4}
            rows={2}
            className="rounded-lg border border-[var(--color-borde)] bg-[var(--color-superficie)] px-3 py-2 text-sm"
          />
        </label>
        <button type="submit" className={panelButtonClass("peligro", "md", "w-fit")}>
          Rechazar
        </button>
      </form>
    </div>
  );
}

/** Historial de pagos de una reserva: comprobantes revisados y cobros en efectivo. */
export function ProofHistoryTable({ history }: { history: ProofHistoryItem[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold tracking-tight">Historial de pagos de esta reserva</h3>
      {history.length === 0 ? (
        <p className="mt-2 text-sm text-[var(--color-texto-suave)]">
          Sin pagos anteriores en esta reserva.
        </p>
      ) : (
        <div className="mt-2 overflow-x-auto rounded-lg border border-[var(--color-borde)]">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--color-borde)] text-xs uppercase tracking-wide text-[var(--color-texto-suave)]">
              <tr>
                <th className="px-3 py-2">Fecha</th>
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2">Monto</th>
                <th className="px-3 py-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              {history.map((item) => (
                <tr key={item.id} className="border-b border-[var(--color-borde)] last:border-0">
                  <td className="tabular px-3 py-2">{formatCaracasDateTime24(item.at)}</td>
                  <td className="px-3 py-2">
                    {item.kind === "COMPROBANTE" ? "Comprobante" : "Efectivo"}
                  </td>
                  <td className="tabular px-3 py-2">
                    {formatMoney(item.amount, item.currency)}
                    {item.currency !== "USD" ? (
                      <span className="block text-xs text-[var(--color-texto-suave)]">
                        {formatMoney(item.amountUsd, "USD")}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">
                    {item.kind === "EFECTIVO" ? (
                      "Cobrado"
                    ) : (
                      <>
                        {item.status ? PROOF_STATUS_LABELS[item.status] : "—"}
                        {item.status === "RECHAZADO" && item.rejectionReason ? (
                          <span className="block text-xs text-[var(--color-texto-suave)]">
                            {item.rejectionReason}
                          </span>
                        ) : null}
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/** Panel lateral de revisión de un comprobante: sus datos, los de la reserva, la cobertura del saldo y el historial. */
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

  return (
    <div className="flex flex-col gap-6">
      <PanelFeedback error={error} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        {badge ? <StatusBadge label={badge.label} tone={badge.tone} /> : <span />}
        <Link href={verReservaHref} className={panelButtonClass("secundario", "sm")}>
          Ver reserva completa
        </Link>
      </div>

      <div>
        <a href={`/api/archivos/${proof.imagePath}`} target="_blank" rel="noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/archivos/${proof.imagePath}`}
            alt={`Comprobante de pago, referencia ${proof.reference}`}
            className="max-h-[60vh] w-full rounded-lg border border-[var(--color-borde)] bg-[var(--color-fondo)] object-contain"
          />
        </a>
        <p className="mt-1 text-xs text-[var(--color-texto-suave)]">
          Haz clic en la imagen para verla en tamaño completo.
        </p>
      </div>

      <div>
        <h3 className="text-sm font-semibold tracking-tight">Datos del pago</h3>
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          <dt className="font-medium text-[var(--color-texto-suave)]">Referencia</dt>
          <dd>{proof.reference}</dd>
          <dt className="font-medium text-[var(--color-texto-suave)]">Método</dt>
          <dd>{proof.paymentMethodName}</dd>
          <dt className="font-medium text-[var(--color-texto-suave)]">Monto declarado</dt>
          <dd className="tabular">{formatMoney(proof.amount, proof.currency)}</dd>
          <dt className="font-medium text-[var(--color-texto-suave)]">En dólares</dt>
          <dd className="tabular">{formatMoney(proof.amountUsd, "USD")}</dd>
          <dt className="font-medium text-[var(--color-texto-suave)]">Cargado el</dt>
          <dd className="tabular">{formatCaracasDateTime24(proof.createdAt)}</dd>
        </dl>
      </div>

      <div>
        <h3 className="text-sm font-semibold tracking-tight">Reserva</h3>
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          <dt className="font-medium text-[var(--color-texto-suave)]">Serial</dt>
          <dd>{reservation.code}</dd>
          <dt className="font-medium text-[var(--color-texto-suave)]">Ruta</dt>
          <dd>
            {reservation.routeName} ({reservation.origin} → {reservation.destination})
          </dd>
          <dt className="font-medium text-[var(--color-texto-suave)]">Salida</dt>
          <dd className="tabular">{formatCaracasDateTime24(reservation.departsAt)}</dd>
          <dt className="font-medium text-[var(--color-texto-suave)]">Pasajeros</dt>
          <dd>{reservation.passengerCount}</dd>
          <dt className="font-medium text-[var(--color-texto-suave)]">Estado de la reserva</dt>
          <dd>{reservationStatusLabel(reservation.status)}</dd>
        </dl>
      </div>

      {coverage ? (
        <div>
          <h3 className="text-sm font-semibold tracking-tight">Cuentas</h3>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
            <dt className="font-medium text-[var(--color-texto-suave)]">Total de la reserva</dt>
            <dd className="tabular">{formatMoney(reservation.totalUsd, "USD")}</dd>
            <dt className="font-medium text-[var(--color-texto-suave)]">Pagado antes</dt>
            <dd className="tabular">{formatMoney(reservation.paidUsd, "USD")}</dd>
            <dt className="font-medium text-[var(--color-texto-suave)]">Este comprobante (USD)</dt>
            <dd className="tabular">{formatMoney(proof.amountUsd, "USD")}</dd>
            <dt className="font-medium text-[var(--color-texto-suave)]">Saldo tras aprobar</dt>
            <dd className="tabular font-semibold">{formatMoney(coverage.balanceAfterUsd, "USD")}</dd>
          </dl>
        </div>
      ) : null}

      <ProofHistoryTable history={history} />

      {proof.status === "PENDIENTE" ? (
        <ProofActions proofId={proof.id} hidden={hidden} />
      ) : (
        <p className="border-t border-[var(--color-borde)] pt-6 text-sm text-[var(--color-texto-suave)]">
          Este comprobante ya fue {proof.status === "APROBADO" ? "aprobado" : "rechazado"} el{" "}
          {proof.reviewedAt ? formatCaracasDateTime24(proof.reviewedAt) : "—"}.
          {proof.status === "RECHAZADO" && proof.rejectionReason
            ? ` Motivo: ${proof.rejectionReason}`
            : ""}
        </p>
      )}
    </div>
  );
}
