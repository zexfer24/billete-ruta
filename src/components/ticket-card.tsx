import Link from "next/link";
import type { ReactNode } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { es } from "date-fns/locale/es";
import { BUSINESS_TZ } from "@/lib/time";
import { formatUsdString } from "@/lib/decimal";
import { reservationStatusLabel, reservationStatusTone } from "@/lib/labels";
import { AgencyBadge } from "./agency-badge";
import { IconBus } from "./icons";
import { Pill } from "./ui";

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
  qrDataUrl?: string;
  href?: string;
  children?: ReactNode;
}

/** "EEE d MMM · HH:mm" en español y hora de Caracas, para la cabecera del ticket. */
function formatSalida(date: Date): string {
  return formatInTimeZone(date, BUSINESS_TZ, "EEE d MMM · HH:mm", { locale: es });
}

/** Tarjeta de ticket con muesca lateral, al estilo Omio: compacta para listas, grande con QR o progreso de pago. */
export function TicketCard({ data, size, qrDataUrl, href, children }: TicketCardProps) {
  const total = Number(data.totalUsd);
  const pagado = Number(data.paidUsd);
  const saldo = Number(data.balanceUsd);
  const progreso = total > 0 ? Math.min(100, Math.round((pagado / total) * 100)) : 0;

  const contenido = (
    <>
      <div className="rounded-t-tarjeta bg-marca p-4 text-white">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] tracking-widest text-white/80">SALIDA</p>
            <p className="tabular whitespace-nowrap font-semibold">{formatSalida(data.departsAt)}</p>
          </div>
          <IconBus aria-hidden="true" />
        </div>
        <p className="mt-2 text-right font-mono text-sm font-semibold tracking-tight whitespace-nowrap">
          <span className="font-sans text-[11px] font-normal tracking-widest text-white/80">SERIAL </span>
          {data.code}
        </p>
      </div>
      <div className="relative border-t-2 border-dashed border-white/40 bg-marca">
        <span
          className="absolute -left-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-lienzo"
          aria-hidden="true"
        />
        <span
          className="absolute -right-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-lienzo"
          aria-hidden="true"
        />
      </div>
      <div className="rounded-b-tarjeta bg-white p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <AgencyBadge agencyId={data.agencyId} name={data.agencyName} size="md" />
            <p className="font-bold leading-snug text-tinta">
              {data.origin} → {data.destination}
            </p>
          </div>
          <div className="ml-auto">
            <Pill tone={reservationStatusTone(data.status)}>{reservationStatusLabel(data.status)}</Pill>
          </div>
        </div>

        {size === "grande" && qrDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={qrDataUrl}
            alt={`Código QR del ticket ${data.code}`}
            width={240}
            height={240}
            className="mx-auto mt-4"
          />
        ) : null}

        {size === "grande" && !qrDataUrl ? (
          <div className="mt-4">
            <div
              role="progressbar"
              aria-valuenow={progreso}
              aria-valuemin={0}
              aria-valuemax={100}
              className="h-2 w-full overflow-hidden rounded-pastilla bg-lienzo"
            >
              <div className="h-full rounded-pastilla bg-exito" style={{ width: `${progreso}%` }} />
            </div>
            <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
              <div>
                <dt className="text-tinta-suave">Total</dt>
                <dd className="tabular font-bold text-tinta">{formatUsdString(data.totalUsd)}</dd>
              </div>
              <div>
                <dt className="text-tinta-suave">Abonado</dt>
                <dd className="tabular font-bold text-tinta">{formatUsdString(data.paidUsd)}</dd>
              </div>
              <div>
                <dt className="text-tinta-suave">Saldo</dt>
                <dd className="tabular font-bold text-tinta">{formatUsdString(data.balanceUsd)}</dd>
              </div>
            </dl>
          </div>
        ) : null}

        {size === "compacta" && saldo > 0 ? (
          <p className="tabular mt-2 text-sm font-semibold text-tinta-suave">
            Saldo {formatUsdString(data.balanceUsd)}
          </p>
        ) : null}

        {children}
      </div>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block overflow-hidden rounded-tarjeta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marca"
      >
        {contenido}
      </Link>
    );
  }

  return <div className="overflow-hidden rounded-tarjeta">{contenido}</div>;
}
