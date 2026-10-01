import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { PanelFeedback } from "@/components/panel-feedback";
import { Alert } from "@/components/alert";
import { EmptyState, PANEL_TD_CLASS, PANEL_TH_CLASS, StatusBadge, panelButtonClass } from "@/components/panel-ui";
import { IconSearch } from "@/components/icons";
import { formatMoney } from "@/lib/decimal";
import { maskIdNumber } from "@/lib/identity";
import { formatCaracasDateTime24 } from "@/lib/time";
import { PROOF_STATUS_LABELS, reservationStatusLabel, type StatusTone } from "@/lib/labels";
import type { ProofCoverage, ProofHistoryItem, ProofReview } from "@/modules/payments";
import { countLabel } from "../_dashboard/text";
import { Disclosure, DetailList } from "./disclosure";
import { ProofDecisionBar } from "./proof-decision";
import { ProofImage } from "./proof-image";
import { showsUsdEquivalent } from "./money";
import { pasajerosUrlFromHidden } from "./urls";
import { tripWhenText } from "./trip-text";
import { departureWhenText } from "../_shared/day-label";

/**
 * Piezas de la revisión de un comprobante. La decisión se toma en un solo
 * lugar, el panel lateral "Revisar comprobante" (`ProofReviewPanel` con
 * `ProofDecisionBar`); el detalle de la reserva solo enlaza a él y reutiliza
 * la pastilla de cobertura y el historial.
 */

/**
 * Qué cubre un comprobante frente al saldo pendiente, en lenguaje llano.
 * Mientras nadie lo aprueba va en tono `info` (spec 3.4: "en validación"),
 * nunca en verde, que quiere decir "pagado, confirmado": una cola llena de
 * pastillas verdes parecía de pagos ya confirmados. Solo "Paga de más" va en
 * alerta, porque es lo único que pide atención antes de aprobar.
 */
export function coverageBadge(coverage: ProofCoverage): { label: string; tone: StatusTone } {
  switch (coverage.kind) {
    case "ABONO_PARCIAL":
      return { label: "Paga una parte", tone: "info" };
    case "PAGO_COMPLETO":
      return { label: "Completa el pago", tone: "info" };
    case "EXCEDE_SALDO":
      return { label: `Paga de más: ${formatMoney(coverage.excessUsd, "USD")}`, tone: "alerta" };
  }
}

/**
 * Cómo queda la reserva si se aprueba el comprobante, en lenguaje llano y con
 * las mismas palabras en la lista y en el panel lateral: "Queda pagada" o
 * "Quedan $ 43,71 por pagar". No se muestra el saldo de antes: junto a
 * "Completa el pago" parecía que el pasajero seguía debiendo ese monto.
 */
export function afterApproval(coverage: ProofCoverage): string {
  return coverage.balanceAfterUsd.greaterThan(0)
    ? `Quedan ${formatMoney(coverage.balanceAfterUsd, "USD")} por pagar`
    : "Queda pagada";
}

/**
 * Lo que pasará al aprobar, con los montos: es la descripción de la
 * confirmación. Usa las mismas palabras que "Si lo apruebas" de la lista y
 * del panel (`afterApproval`), sin la palabra contable "saldo".
 */
function approvalConsequence(coverage: ProofCoverage, amountUsd: Prisma.Decimal): string {
  const suma = `Se sumarán ${formatMoney(amountUsd, "USD")} a lo pagado.`;
  switch (coverage.kind) {
    case "ABONO_PARCIAL":
      return `${suma} ${afterApproval(coverage)}; el ticket se emite cuando la reserva esté pagada completa.`;
    case "PAGO_COMPLETO":
      return `${suma} La reserva queda pagada y se emite el ticket.`;
    case "EXCEDE_SALDO":
      return `Este pago supera lo que falta por ${formatMoney(coverage.excessUsd, "USD")}. La reserva queda pagada y se emite el ticket.`;
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
  // Las fechas se dicen como en la lista de fondo ("Hoy 06:00", "Sábado 03/10 19:00").
  const now = new Date();

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
            { label: "Enviado", value: <span className="tabular">{tripWhenText(proof.createdAt, now)}</span> },
            ...(coverage
              ? [
                  {
                    label: "Si lo apruebas",
                    value: <span className="tabular font-semibold">{afterApproval(coverage)}</span>,
                  },
                ]
              : []),
          ]}
        />
      </div>

      <ProofImage src={imagen} reference={proof.reference} />

      {proof.status === "PENDIENTE" ? null : (
        <Alert tone={proof.status === "APROBADO" ? "exito" : "info"} role="none" title="Este comprobante ya se revisó">
          Fue {proof.status === "APROBADO" ? "aprobado" : "rechazado"}
          {proof.reviewedAt ? ` ${departureWhenText(proof.reviewedAt, now)}` : ""}.
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
                  value: <span className="tabular">{tripWhenText(reservation.departsAt, now)}</span>,
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
