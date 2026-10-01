import Link from "next/link";
import { PanelFeedback } from "@/components/panel-feedback";
import { Alert } from "@/components/alert";
import { EmptyState, ProgressBar, StatusBadge, panelButtonClass } from "@/components/panel-ui";
import { IconDownload, IconSearch } from "@/components/icons";
import { formatMoney } from "@/lib/decimal";
import { formatCaracasDateTime24, formatCaracasTime24 } from "@/lib/time";
import {
  departureStatusLabel,
  departureStatusTone,
  reservationStatusLabel,
  reservationStatusTone,
} from "@/lib/labels";
import type { AgencyReservationDetail } from "@/modules/reports";
import { CashPaymentForm } from "@/app/panel/_forms/cash-payment-form";
import { countLabel } from "../_dashboard/text";
import { coverageBadge, PaymentHistory, ProofActions } from "./proof-review";
import { showsUsdEquivalent } from "./money";
import { Disclosure, DetailList } from "./disclosure";

/** Título de una sección del panel lateral. */
function PanelSectionTitle({ children }: { children: string }) {
  return <h3 className="text-base font-semibold text-tinta">{children}</h3>;
}

/** La reserva no existe o es de otra agencia: se dice con claridad y se ofrece volver. */
export function ReservationNotFound({ closeHref }: { closeHref: string }) {
  return (
    <EmptyState
      icon={<IconSearch />}
      title="No encontramos esta reserva"
      description="Puede que el enlace esté incompleto o que la reserva sea de otra agencia."
      action={
        <Link href={closeHref} scroll={false} className={panelButtonClass("secundario")}>
          Volver a la lista
        </Link>
      }
    />
  );
}

/**
 * Detalle de una reserva en el panel lateral (`?reserva=<id>`). Arriba el
 * resumen con cuánto se pagó y cuánto falta; después la acción que toca
 * (revisar un comprobante, cobrar el saldo o descargar el ticket); luego el
 * viaje y los pasajeros; y plegados, el desglose del precio y el historial.
 */
export function ReservationDetailPanel({
  detail,
  hidden,
  error,
  ok,
}: {
  detail: AgencyReservationDetail;
  hidden: Record<string, string>;
  error?: string;
  ok?: string;
}) {
  const { reservation, holder, departure, passengers, ticket, pendingProofs, history, canRegisterCash } = detail;
  const seLibera =
    reservation.status === "PENDIENTE_PAGO" &&
    reservation.expiresAt !== null &&
    reservation.expiresAt.getTime() > Date.now();
  const saldoCero = reservation.balanceUsd.isZero() || reservation.balanceUsd.isNegative();

  return (
    <div className="flex flex-col gap-6">
      <PanelFeedback error={error} ok={ok} />

      <div className="flex flex-col gap-4 rounded-tarjeta border border-borde bg-lienzo p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="tabular text-lg font-bold tracking-tight text-tinta">{reservation.code}</p>
            <p className="text-[15px] text-tinta">
              {holder.fullName} <span className="tabular text-tinta-suave">· {holder.maskedIdNumber}</span>
            </p>
            <p className="text-sm text-tinta-suave">
              {reservation.salesChannel === "TAQUILLA" ? "Vendida en taquilla" : "Reservada en la app"} el{" "}
              <span className="tabular">{formatCaracasDateTime24(reservation.createdAt)}</span>
            </p>
          </div>
          <StatusBadge
            label={reservationStatusLabel(reservation.status)}
            tone={reservationStatusTone(reservation.status)}
          />
        </div>
        <ProgressBar
          value={Number(reservation.paidUsd.toString())}
          max={Number(reservation.totalUsd.toString())}
          label={`Pagado ${formatMoney(reservation.paidUsd, "USD")} de ${formatMoney(reservation.totalUsd, "USD")}`}
          detail={saldoCero ? "Pagado completo" : `Falta ${formatMoney(reservation.balanceUsd, "USD")}`}
          tone={saldoCero ? "exito" : "marca"}
        />
        {seLibera && reservation.expiresAt ? (
          <Alert tone="alerta" role="none">
            Si no recibe ningún pago, el puesto se libera a las {formatCaracasTime24(reservation.expiresAt)}.
          </Alert>
        ) : null}
      </div>

      {pendingProofs.length > 0 ? (
        <section className="flex flex-col gap-3">
          <PanelSectionTitle>
            {pendingProofs.length === 1 ? "Comprobante por revisar" : "Comprobantes por revisar"}
          </PanelSectionTitle>
          {pendingProofs.map((p) => {
            const badge = coverageBadge(p.coverage);
            const imagen = `/api/archivos/${p.imagePath}`;
            return (
              <div key={p.id} className="flex flex-col gap-4 rounded-tarjeta border border-borde p-4">
                <div className="flex flex-wrap items-start gap-4">
                  <a
                    href={imagen}
                    target="_blank"
                    rel="noreferrer"
                    className="foco shrink-0 rounded-control"
                  >
                    {/* Imagen subida por el pasajero y servida por /api/archivos: no pasa por next/image. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imagen}
                      alt={`Comprobante con referencia ${p.reference}, abrir en tamaño completo`}
                      className="size-24 rounded-control border border-borde object-cover"
                    />
                  </a>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <p className="tabular text-xl font-bold text-tinta">{formatMoney(p.amount, p.currency)}</p>
                    {showsUsdEquivalent(p.currency) ? (
                      <p className="tabular text-sm text-tinta-suave">Equivale a {formatMoney(p.amountUsd, "USD")}</p>
                    ) : null}
                    <p className="text-sm text-tinta-suave">
                      Referencia <span className="tabular font-semibold text-tinta">{p.reference}</span> ·{" "}
                      {p.paymentMethodName}
                    </p>
                    <div className="mt-1">
                      <StatusBadge label={badge.label} tone={badge.tone} />
                    </div>
                  </div>
                </div>
                <ProofActions
                  proofId={p.id}
                  code={reservation.code}
                  amountUsd={p.amountUsd}
                  coverage={p.coverage}
                  hidden={hidden}
                />
              </div>
            );
          })}
        </section>
      ) : null}

      {canRegisterCash ? (
        <section className="flex flex-col gap-3">
          <PanelSectionTitle>Cobrar en efectivo</PanelSectionTitle>
          <CashPaymentForm
            mode="reserva"
            reservationId={reservation.id}
            balanceUsd={reservation.balanceUsd.toString()}
            currency={reservation.currency}
            amountInCurrencyHint={
              reservation.currency !== "USD"
                ? `Total de la reserva en ${reservation.currency}: ${formatMoney(
                    reservation.amountInCurrency,
                    reservation.currency,
                  )}.`
                : undefined
            }
            hidden={hidden}
          />
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <PanelSectionTitle>Ticket</PanelSectionTitle>
        {ticket ? (
          <div className="flex flex-col gap-3">
            <p className="text-[15px] text-tinta">
              Emitido el <span className="tabular">{formatCaracasDateTime24(ticket.issuedAt)}</span>.
            </p>
            <a
              href={`/api/archivos/${ticket.pdfPath}`}
              target="_blank"
              rel="noreferrer"
              className={panelButtonClass("secundario", "md", "w-fit")}
            >
              <IconDownload className="size-5" />
              Descargar el ticket (PDF)
              <span className="sr-only">(se abre en otra pestaña)</span>
            </a>
          </div>
        ) : (
          <p className="text-[15px] text-tinta-suave">El ticket se emite solo cuando el saldo llegue a cero.</p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <PanelSectionTitle>Viaje</PanelSectionTitle>
        <DetailList
          items={[
            { label: "Ruta", value: `${departure.origin} → ${departure.destination}` },
            {
              label: "Fecha y hora",
              value: <span className="tabular">{formatCaracasDateTime24(departure.departsAt)}</span>,
            },
            { label: "Bus", value: <span className="tabular">{departure.vehiclePlate}</span> },
            {
              label: "Estado",
              value: (
                <StatusBadge label={departureStatusLabel(departure.status)} tone={departureStatusTone(departure.status)} />
              ),
            },
          ]}
        />
      </section>

      <section className="flex flex-col gap-3">
        <PanelSectionTitle>{`Pasajeros · ${countLabel(passengers.length, "persona", "personas")}`}</PanelSectionTitle>
        <ul className="flex flex-col gap-2">
          {passengers.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-borde px-4 py-3"
            >
              <span className="min-w-0 text-[15px] text-tinta">
                <span className="font-semibold">{p.fullName}</span>{" "}
                <span className="tabular text-tinta-suave">· {p.maskedIdNumber}</span>
                {p.isHolder ? <span className="text-tinta-suave"> · Titular</span> : null}
              </span>
              {p.boardedAt ? (
                <StatusBadge label={`Abordó a las ${formatCaracasTime24(p.boardedAt)}`} tone="exito" />
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <div className="flex flex-col gap-3">
        <Disclosure title="Desglose del precio">
          <div className="flex flex-col gap-3">
            <DetailList
              items={[
                { label: "Tarifa", value: <span className="tabular">{formatMoney(reservation.fareTotalUsd, "USD")}</span> },
                {
                  label: "Tasa del terminal",
                  value: <span className="tabular">{formatMoney(reservation.taxTotalUsd, "USD")}</span>,
                },
                {
                  label: "Total",
                  value: <span className="tabular font-semibold">{formatMoney(reservation.totalUsd, "USD")}</span>,
                },
                { label: "Pagado", value: <span className="tabular">{formatMoney(reservation.paidUsd, "USD")}</span> },
                {
                  label: "Falta",
                  value: <span className="tabular font-semibold">{formatMoney(reservation.balanceUsd, "USD")}</span>,
                },
                { label: "Forma de pago", value: reservation.paymentMethodName },
              ]}
            />
            {reservation.currency !== "USD" ? (
              <p className="text-sm text-tinta-suave">
                Total en {reservation.currency}:{" "}
                <span className="tabular">{formatMoney(reservation.amountInCurrency, reservation.currency)}</span>
              </p>
            ) : null}
          </div>
        </Disclosure>
        <PaymentHistory history={history} />
      </div>
    </div>
  );
}
