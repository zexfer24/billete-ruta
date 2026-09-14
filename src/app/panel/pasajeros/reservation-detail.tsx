import { PanelFeedback } from "@/components/panel-feedback";
import { StatusBadge } from "@/components/panel-ui";
import { formatMoney } from "@/lib/decimal";
import { formatCaracasDateTime24, formatCaracasTime24 } from "@/lib/time";
import {
  departureStatusLabel,
  departureStatusTone,
  reservationStatusLabel,
  reservationStatusTone,
  salesChannelLabel,
} from "@/lib/labels";
import type { AgencyReservationDetail } from "@/modules/reports";
import { CashPaymentForm } from "@/app/panel/_forms/cash-payment-form";
import { coverageBadge, ProofActions, ProofHistoryTable } from "./proof-review";

/**
 * Detalle completo de una reserva, en el panel lateral abierto con
 * `?reserva=<id>`. Reutiliza `ProofActions` y `ProofHistoryTable` del panel
 * de comprobante en vez de repetir su marcado.
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
  const { reservation, departure, passengers, ticket, pendingProofs, history, canRegisterCash } = detail;
  const seLibera =
    reservation.status === "PENDIENTE_PAGO" &&
    reservation.expiresAt !== null &&
    reservation.expiresAt.getTime() > Date.now();

  return (
    <div className="flex flex-col gap-6">
      <PanelFeedback error={error} ok={ok} />

      <section>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge
            label={reservationStatusLabel(reservation.status)}
            tone={reservationStatusTone(reservation.status)}
          />
          <span className="text-sm text-[var(--color-texto-suave)]">
            {salesChannelLabel(reservation.salesChannel)}
          </span>
        </div>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          <dt className="font-medium text-[var(--color-texto-suave)]">Creada el</dt>
          <dd className="tabular">{formatCaracasDateTime24(reservation.createdAt)}</dd>
          <dt className="font-medium text-[var(--color-texto-suave)]">Método de pago</dt>
          <dd>{reservation.paymentMethodName}</dd>
        </dl>
        {seLibera && reservation.expiresAt ? (
          <p className="mt-2 text-sm text-[var(--color-alerta)]">
            Se libera a las {formatCaracasTime24(reservation.expiresAt)} si no recibe pago
          </p>
        ) : null}
      </section>

      <section>
        <h3 className="text-sm font-semibold tracking-tight">Salida</h3>
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          <dt className="font-medium text-[var(--color-texto-suave)]">Ruta</dt>
          <dd>
            {departure.origin} → {departure.destination}
          </dd>
          <dt className="font-medium text-[var(--color-texto-suave)]">Fecha y hora</dt>
          <dd className="tabular">{formatCaracasDateTime24(departure.departsAt)}</dd>
          <dt className="font-medium text-[var(--color-texto-suave)]">Placa</dt>
          <dd className="tabular">{departure.vehiclePlate}</dd>
          <dt className="font-medium text-[var(--color-texto-suave)]">Estado</dt>
          <dd>
            <StatusBadge
              label={departureStatusLabel(departure.status)}
              tone={departureStatusTone(departure.status)}
            />
          </dd>
        </dl>
      </section>

      <section>
        <h3 className="text-sm font-semibold tracking-tight">Pasajeros</h3>
        <ul className="mt-2 flex flex-col gap-2 text-sm">
          {passengers.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--color-borde)] px-3 py-2"
            >
              <span>
                {p.fullName}{" "}
                <span className="tabular text-[var(--color-texto-suave)]">{p.maskedIdNumber}</span>
                {p.isHolder ? (
                  <span className="ml-1 text-[var(--color-texto-suave)]">(titular)</span>
                ) : null}
              </span>
              {p.boardedAt ? (
                <span className="tabular text-xs text-[var(--color-exito)]">
                  Abordó {formatCaracasTime24(p.boardedAt)}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="text-sm font-semibold tracking-tight">Cuentas</h3>
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          <dt className="font-medium text-[var(--color-texto-suave)]">Tarifa</dt>
          <dd className="tabular">{formatMoney(reservation.fareTotalUsd, "USD")}</dd>
          <dt className="font-medium text-[var(--color-texto-suave)]">Tasa de salida</dt>
          <dd className="tabular">{formatMoney(reservation.taxTotalUsd, "USD")}</dd>
          <dt className="font-medium text-[var(--color-texto-suave)]">Total</dt>
          <dd className="tabular">{formatMoney(reservation.totalUsd, "USD")}</dd>
          <dt className="font-medium text-[var(--color-texto-suave)]">Abonado</dt>
          <dd className="tabular">{formatMoney(reservation.paidUsd, "USD")}</dd>
          <dt className="font-medium text-[var(--color-texto-suave)]">Saldo</dt>
          <dd className="tabular font-semibold">{formatMoney(reservation.balanceUsd, "USD")}</dd>
        </dl>
        {reservation.currency !== "USD" ? (
          <p className="mt-2 text-sm text-[var(--color-texto-suave)]">
            Total en {reservation.currency}:{" "}
            {formatMoney(reservation.amountInCurrency, reservation.currency)}
          </p>
        ) : null}
      </section>

      <section>
        <h3 className="text-sm font-semibold tracking-tight">Ticket</h3>
        {ticket ? (
          <p className="mt-2 text-sm">
            Emitido el {formatCaracasDateTime24(ticket.issuedAt)} ·{" "}
            <a
              href={`/api/archivos/${ticket.pdfPath}`}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-[var(--color-acento)] underline"
            >
              Descargar PDF
            </a>
          </p>
        ) : (
          <p className="mt-2 text-sm text-[var(--color-texto-suave)]">
            Se emite cuando el saldo llegue a cero.
          </p>
        )}
      </section>

      {pendingProofs.length > 0 ? (
        <section className="flex flex-col gap-4">
          <h3 className="text-sm font-semibold tracking-tight">Comprobantes por revisar</h3>
          {pendingProofs.map((p) => {
            const badge = coverageBadge(p.coverage);
            return (
              <div
                key={p.id}
                className="flex flex-col gap-3 rounded-lg border border-[var(--color-borde)] p-4"
              >
                <div className="flex flex-wrap items-start gap-4">
                  <a
                    href={`/api/archivos/${p.imagePath}`}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/archivos/${p.imagePath}`}
                      alt={`Comprobante de pago, referencia ${p.reference}`}
                      className="h-20 w-20 rounded-lg border border-[var(--color-borde)] object-cover"
                    />
                  </a>
                  <div className="flex-1 text-sm">
                    <p>
                      Ref. {p.reference} · {p.paymentMethodName}
                    </p>
                    <p className="tabular">
                      {formatMoney(p.amount, p.currency)} · {formatMoney(p.amountUsd, "USD")}
                    </p>
                    <div className="mt-1">
                      <StatusBadge label={badge.label} tone={badge.tone} />
                    </div>
                  </div>
                </div>
                <ProofActions proofId={p.id} hidden={hidden} />
              </div>
            );
          })}
        </section>
      ) : null}

      {canRegisterCash ? (
        <section>
          <h3 className="text-sm font-semibold tracking-tight">Registrar cobro en efectivo</h3>
          <div className="mt-2">
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
          </div>
        </section>
      ) : null}

      <ProofHistoryTable history={history} />
    </div>
  );
}
