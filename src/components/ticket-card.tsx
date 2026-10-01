import Link from "next/link";
import type { ReactNode } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { es } from "date-fns/locale/es";
import { BUSINESS_TZ } from "@/lib/time";
import { formatUsdString } from "@/lib/decimal";
import { passengerStatusLabel } from "@/lib/labels";
import { AgencyBadge } from "./agency-badge";
import { IconChevronRight } from "./icons";
import { Isotipo, LogoLockup } from "./logo";
import {
  isInactiveReservation,
  passengerStatusTone,
  paymentPhrase,
  reservationActionLabel,
} from "./passenger-copy";
import { Pill, ProgressBar } from "./ui";
import { cx } from "./ui-classes";

export interface TicketCardData {
  code: string;
  origin: string;
  destination: string;
  departsAt: Date;
  agencyId: string;
  agencyName: string;
  status: string;
  totalUsd: string;
  paidUsd: string;
  balanceUsd: string;
  passengerCount: number;
}

interface TicketCardProps {
  data: TicketCardData;
  size: "compacta" | "grande";
  /** Imagen del QR (data URL). Solo la tarjeta grande la muestra. */
  qrDataUrl?: string;
  /** Con enlace, la tarjeta compacta entera lleva al detalle y dice qué hacer ahí. */
  href?: string;
  /**
   * Solo en la tarjeta grande: calla la frase de pago ("Estamos revisando tu
   * comprobante…") cuando la página ya la explica justo debajo, para no
   * decir lo mismo dos veces. La barra de pago se sigue mostrando.
   */
  hidePaymentPhrase?: boolean;
  /**
   * Solo en la tarjeta grande: suma de los comprobantes que la agencia aún no
   * revisa, en dólares ("26.00"). La barra dice cuánto está en revisión en vez
   * de un "Pagaste $ 0,00" que asusta a quien acaba de pagar.
   */
  reviewUsd?: string;
  children?: ReactNode;
}

/** "lun 12 oct" en español y hora de Caracas. */
function formatDay(date: Date): string {
  return formatInTimeZone(date, BUSINESS_TZ, "EEE d MMM", { locale: es });
}

/** "lunes 12 de octubre", para el ticket grande. */
function formatLongDay(date: Date): string {
  return formatInTimeZone(date, BUSINESS_TZ, "EEEE d 'de' MMMM", { locale: es });
}

/** Hora de salida en formato de 24 horas, hora de Caracas. */
function formatHour(date: Date): string {
  return formatInTimeZone(date, BUSINESS_TZ, "HH:mm");
}

function passengersText(count: number): string {
  return count === 1 ? "1 pasajero" : `${count} pasajeros`;
}

/**
 * Separador perforado entre la cabecera y el cuerpo del ticket: línea de
 * puntos con dos muescas del color del fondo de la página.
 */
function Perforation({ inactive }: { inactive: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={cx(
        "relative h-0 border-t-2 border-dashed",
        inactive ? "border-borde" : "border-marca-300",
      )}
    >
      <span className="absolute -left-3 top-0 size-6 -translate-y-1/2 rounded-full border border-borde bg-lienzo" />
      <span className="absolute -right-3 top-0 size-6 -translate-y-1/2 rounded-full border border-borde bg-lienzo" />
    </div>
  );
}

/**
 * Ticket del pasajero (spec 7.1): cabecera morada con el isotipo, la ruta y
 * la hora de salida grandes; cuerpo con la agencia, el estado en palabras del
 * pasajero y, en la versión grande, el QR para abordar o la barra de pago con
 * lo que falta. Una reserva que ya no sirve (liberada, cancelada o sin
 * presentarse) se muestra apagada para no confundirla con un ticket válido.
 * La versión compacta, con `href`, es un enlace entero que dice qué hacer.
 */
export function TicketCard({
  data,
  size,
  qrDataUrl,
  href,
  hidePaymentPhrase = false,
  reviewUsd,
  children,
}: TicketCardProps) {
  const inactive = isInactiveReservation(data.status);
  const balance = formatUsdString(data.balanceUsd);
  // La flecha es visual; el lector de pantalla oye "Caracas a Valencia".
  const route = (
    <>
      {data.origin}
      <span aria-hidden="true"> → </span>
      <span className="sr-only"> a </span>
      {data.destination}
    </>
  );

  const statusPill = (
    <Pill tone={passengerStatusTone(data.status)}>{passengerStatusLabel(data.status)}</Pill>
  );

  const headerTone = inactive ? "bg-lienzo text-tinta" : "bg-marca-600 text-white";
  const headerMuted = inactive ? "text-tinta-suave" : "text-white/85";

  if (size === "grande") {
    const total = Number(data.totalUsd);
    const paid = Number(data.paidUsd);
    const showQr = Boolean(qrDataUrl) && !inactive;
    const review = reviewUsd !== undefined && Number(reviewUsd) > 0 ? formatUsdString(reviewUsd) : null;
    // Todo lo enviado está en revisión y aún no hay nada aprobado: la barra vacía no aporta nada.
    const onlyInReview = review !== null && paid <= 0;

    return (
      <article
        aria-label={`Ticket de ${data.origin} a ${data.destination}`}
        className="overflow-hidden rounded-tarjeta border border-borde bg-superficie shadow-1"
      >
        <div className={cx("p-5", headerTone)}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <LogoLockup tone={inactive ? "marca" : "blanco"} />
            <span className={cx("text-sm font-medium", headerMuted)}>
              {passengersText(data.passengerCount)}
            </span>
          </div>
          <p className="mt-5 break-words text-2xl font-bold leading-tight tracking-tight">{route}</p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
            <p className="text-base first-letter:uppercase">{formatLongDay(data.departsAt)}</p>
            <p className="tabular text-3xl font-bold leading-none">
              <span className="sr-only">Sale a las </span>
              {formatHour(data.departsAt)}
            </p>
          </div>
        </div>

        <Perforation inactive={inactive} />

        <div className="flex flex-col gap-4 p-5">
          <div className="flex flex-wrap items-center gap-3">
            {/* El nombre ya va al lado: el bloque es decorativo para no leerlo dos veces. */}
            <AgencyBadge agencyId={data.agencyId} name={data.agencyName} size="sm" decorative />
            <p className="min-w-0 flex-1 font-semibold text-tinta">{data.agencyName}</p>
            {statusPill}
          </div>

          {showQr ? (
            <div className="flex flex-col items-center gap-3 text-center">
              {/* QR como data URL generado en el servidor: next/image no aporta nada aquí. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrDataUrl}
                alt={`Código QR del ticket ${data.code}`}
                width={256}
                height={256}
                className="aspect-square w-full max-w-64 rounded-control border border-borde bg-superficie p-2"
              />
              <div>
                <p className="text-base font-semibold text-tinta">Muestra este código al abordar</p>
                <p className="text-sm text-tinta-suave">
                  Si el chofer no puede leerlo, sube el brillo de la pantalla.
                </p>
              </div>
            </div>
          ) : !inactive || !hidePaymentPhrase ? (
            <div className="flex flex-col gap-2">
              {inactive ? null : onlyInReview ? (
                <p className="tabular text-sm font-medium text-tinta">
                  Enviaste {review}: lo estamos revisando
                </p>
              ) : (
                <ProgressBar
                  value={paid}
                  max={total}
                  tone={data.status === "PAGADA" ? "exito" : "marca"}
                  label={`Pagaste ${formatUsdString(data.paidUsd)} de ${formatUsdString(data.totalUsd)}`}
                  detail={review ? `${review} en revisión` : undefined}
                />
              )}
              {hidePaymentPhrase ? null : (
                <p className="text-base text-tinta">{paymentPhrase(data.status, balance)}</p>
              )}
            </div>
          ) : null}

          <div className="rounded-control bg-lienzo px-4 py-3">
            <p className="text-sm text-tinta-suave">{showQr ? "Código del ticket" : "Código de reserva"}</p>
            <p className="tabular break-all text-xl font-bold tracking-wide text-tinta">{data.code}</p>
          </div>

          {children}
        </div>
      </article>
    );
  }

  const body = (
    <>
      <div className={cx("flex items-center gap-3 p-4", headerTone)}>
        <Isotipo tone={inactive ? "marca" : "blanco"} decorative className="h-10 w-auto shrink-0" />
        <div className="min-w-0 flex-1">
          <p className={cx("text-sm", headerMuted)}>Salida</p>
          <p className="tabular text-lg font-bold leading-tight first-letter:uppercase">
            {formatDay(data.departsAt)} · {formatHour(data.departsAt)}
          </p>
        </div>
      </div>

      <Perforation inactive={inactive} />

      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-center gap-3">
          {/* El nombre de la agencia va visible debajo de la ruta: el bloque es decorativo. */}
          <AgencyBadge agencyId={data.agencyId} name={data.agencyName} size="sm" decorative />
          <div className="min-w-0 flex-1">
            <p className="break-words font-bold leading-snug text-tinta">{route}</p>
            <p className="break-words text-sm text-tinta-suave">{data.agencyName}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          {statusPill}
          <p className="tabular text-sm text-tinta-suave">
            <span className="sr-only">Código de reserva </span>
            {data.code}
          </p>
        </div>
        {href ? (
          <p className="flex items-center justify-between gap-2 border-t border-borde pt-3 font-semibold text-marca-700">
            <span>{reservationActionLabel(data.status, balance)}</span>
            <IconChevronRight aria-hidden="true" className="shrink-0" />
          </p>
        ) : null}
        {children}
      </div>
    </>
  );

  const shell = "block overflow-hidden rounded-tarjeta border border-borde bg-superficie shadow-1";

  if (href) {
    return (
      <Link
        href={href}
        className={cx(
          shell,
          "foco transition-shadow duration-150 ease-out hover:shadow-2 motion-reduce:transition-none",
        )}
      >
        {body}
      </Link>
    );
  }

  return <div className={shell}>{body}</div>;
}
